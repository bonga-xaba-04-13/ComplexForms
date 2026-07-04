import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControlRendererComponent } from './shared/form-control-renderer.component';
import { FormLoaderService } from './services/form-loader.service';
import {
  StepReference,
  LoadedStep,
  StepState,
  JointCaptureData,
  MultiParticipantPayload,
  Participant,
} from './models/index';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-patient-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlRendererComponent],
  templateUrl: './patient-registration.component.html',
  styleUrl: './patient-registration.component.scss',
})
export class PatientRegistrationComponent implements OnInit, OnDestroy {
  // ===== Stepper Structure =====
  stepRefs: StepReference[] = [];
  loadedSteps: (LoadedStep | null)[] = [];
  stepStates: StepState[] = [];
  currentStep = 0;
  completedSteps = new Set<number>();

  // ===== Form State =====
  forms: FormGroup[] = [];
  partnerForms: (FormGroup | null)[] = [];

  // ===== Joint Capture =====
  joint: JointCaptureData = {
    enabled: false,
    activeRole: 'patient',
    partnerActive: false,
    completedByRole: { patient: new Set(), partner: new Set() },
  };

  // ===== Stepper Loading =====
  stepperLoading = true;
  stepperError = false;
  stepperErrorMessage = '';

  // ===== UI State =====
  toastMessage = '';
  toastVisible = false;
  toastType: 'success' | 'error' | 'info' = 'success';

  errorModalVisible = false;
  errorModalMessage = '';
  errorModalDetails: string[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private formLoaderService: FormLoaderService,
    private dialogRef: MatDialogRef<PatientRegistrationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title?: string }
  ) {}

  ngOnInit() {
    this.loadStepper();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load stepper skeleton (step references only, no field definitions).
   */
  private loadStepper() {
    this.stepperLoading = true;
    this.formLoaderService
      .loadStepper()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stepper) => {
          this.onStepperLoaded(stepper);
          this.stepperLoading = false;
          this.stepperError = false;
        },
        error: (err) => {
          console.error('Error loading stepper:', err);
          this.stepperLoading = false;
          this.stepperError = true;
          this.stepperErrorMessage = 'Failed to load form. Please try again.';
        },
      });
  }

  /**
   * Initialize stepper: create step references, state arrays, and forms.
   * Lazy-load step 0 immediately.
   */
  private onStepperLoaded(stepper: any) {
    this.stepRefs = [...stepper.steps].sort(
      (a, b) => (a.order ?? a.stepId) - (b.order ?? b.stepId)
    );
    this.loadedSteps = this.stepRefs.map(() => null);
    this.stepStates = this.stepRefs.map(() => ({ status: 'idle' }));
    this.forms = this.stepRefs.map(() => this.fb.group({}));
    this.partnerForms = this.stepRefs.map(() => null);

    // Eagerly load step 0; others load on-demand
    this.ensureStepLoaded(this.currentStep);
  }

  /**
   * Lazy-load a step's form definition if not already loaded.
   * Idempotent: calling multiple times won't re-fetch.
   */
  private ensureStepLoaded(index: number) {
    const state = this.stepStates[index];
    if (!state || state.status === 'loaded' || state.status === 'loading') {
      return;
    }

    const keyname = this.stepRefs[index].formKeyname;
    this.stepStates[index] = { status: 'loading' };

    this.formLoaderService
      .loadFormForStep(keyname)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (loaded) => {
          this.loadedSteps[index] = loaded;
          this.stepStates[index] = { status: 'loaded' };
          this.applyJointCapability(loaded);
        },
        error: (err) => {
          this.stepStates[index] = {
            status: 'error',
            errorMessage: this.humanizeStepError(err),
          };
        },
      });
  }

  /**
   * Called when user navigates to a new step.
   */
  private onStepChanged() {
    this.ensureStepLoaded(this.currentStep);
    // Optional: prefetch next step while user reads current one
    if (this.currentStep < this.stepRefs.length - 1) {
      const nextKeyname = this.stepRefs[this.currentStep + 1].formKeyname;
      this.formLoaderService
        .loadFormForStep(nextKeyname)
        .pipe(takeUntil(this.destroy$))
        .subscribe(); // fire-and-forget
    }
  }

  /**
   * Check if joint capture is possible for this step.
   */
  private applyJointCapability(loaded: LoadedStep) {
    if (loaded.allowDynamicParticipants) {
      this.joint.enabled = true;
    }
  }

  /**
   * User manually retries a failed step load.
   */
  retryStep(index: number) {
    this.stepStates[index] = { status: 'idle' };
    this.ensureStepLoaded(index);
  }

  /**
   * Retry loading the stepper skeleton.
   */
  retryLoadStepper() {
    this.loadStepper();
  }

  // ===== Navigation =====

  goToStep(stepIndex: number) {
    if (!this.isStepAccessible(stepIndex)) {
      return;
    }
    if (this.stepStates[this.currentStep]?.status === 'loaded') {
      if (!this.validateCurrentStep()) {
        return;
      }
      this.saveStepData();
    }
    this.currentStep = stepIndex;
    this.onStepChanged();
  }

  previousStep() {
    if (this.currentStep > 0) {
      if (this.stepStates[this.currentStep]?.status === 'loaded') {
        this.saveStepData();
      }
      this.currentStep--;
      this.onStepChanged();
    }
  }

  nextStep() {
    if (this.stepStates[this.currentStep]?.status !== 'loaded') {
      return;
    }
    if (!this.validateCurrentStep()) {
      return;
    }
    this.saveStepData();
    this.completedSteps.add(this.currentStep);
    if (this.currentStep < this.stepRefs.length - 1) {
      this.currentStep++;
      this.onStepChanged();
    }
  }

  submitForm() {
    if (this.stepStates[this.currentStep]?.status !== 'loaded') {
      return;
    }
    if (!this.validateCurrentStep()) {
      return;
    }
    this.saveStepData();
    this.completedSteps.add(this.currentStep);

    const payload = this.buildPayload();
    this.showToast('Form submitted successfully!', 'success');
    console.log('Form Payload:', payload);
    // Send to backend
  }

  // ===== Form Data Management =====

  private saveStepData() {
    // FormGroup reactive forms automatically track data
  }

  private buildPayload(): MultiParticipantPayload {
    const patientData: Record<string, any> = {};
    this.stepRefs.forEach((ref, i) => {
      patientData[ref.formKeyname] = this.forms[i]?.value ?? {};
    });

    const participants: Participant[] = [{ role: 'patient', forms: patientData }];

    if (this.joint.partnerActive) {
      const partnerData: Record<string, any> = {};
      this.stepRefs.forEach((ref, i) => {
        partnerData[ref.formKeyname] = this.partnerForms[i]?.value ?? {};
      });
      participants.push({ role: 'partner', forms: partnerData });
    }

    return {
      stepperKeyname: 'patient_intake_stepper',
      participants,
      timestamp: new Date().toISOString(),
      completed: true,
    };
  }

  // ===== Joint Capture =====

  togglePartner(active: boolean) {
    this.joint.partnerActive = active;
    if (active && !this.partnerForms[this.currentStep]) {
      this.partnerForms[this.currentStep] = this.fb.group({});
    }
    this.joint.activeRole = active ? 'partner' : 'patient';
  }

  get activeForm(): FormGroup {
    if (
      this.joint.activeRole === 'partner' &&
      this.partnerForms[this.currentStep]
    ) {
      return this.partnerForms[this.currentStep]!;
    }
    return this.forms[this.currentStep];
  }

  // ===== Validation =====

  private validateCurrentStep(): boolean {
    const form = this.forms[this.currentStep];
    if (!form.valid) {
      const errors = this.getFormErrors(form);
      this.showErrorModal('Please fill in all required fields', errors);
      return false;
    }
    return true;
  }

  private getFormErrors(form: FormGroup): string[] {
    const errors: string[] = [];
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      if (control && control.invalid && control.touched) {
        errors.push(`${key}: Invalid value`);
      }
    });
    return errors;
  }

  isStepAccessible(stepIndex: number): boolean {
    if (stepIndex <= this.currentStep) return true;
    if (
      stepIndex === this.currentStep + 1 &&
      this.completedSteps.has(this.currentStep)
    ) {
      return true;
    }
    return false;
  }

  // ===== UI Helpers =====

  getFieldGridClass(field: any): string {
    if (field.type === 'textarea' || field.type === 'checkgroup') {
      return 'form-field full-width';
    }
    return 'form-field';
  }

  private humanizeStepError(err: any): string {
    if (err?.message === 'FORM_NOT_FOUND') {
      return 'Form definition not found. Please try again.';
    }
    return 'Failed to load this step. Please try again.';
  }

  private showErrorModal(message: string, details: string[]) {
    this.errorModalMessage = message;
    this.errorModalDetails = details;
    this.errorModalVisible = true;
  }

  closeErrorModal() {
    this.errorModalVisible = false;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    setTimeout(() => {
      this.toastVisible = false;
    }, 3000);
  }

  closeDialog() {
    this.dialogRef.close();
  }

  // ===== Computed Properties =====

  get currentStepData(): LoadedStep | null {
    return this.loadedSteps[this.currentStep] || null;
  }

  get canProceed(): boolean {
    return this.currentStep < this.stepRefs.length - 1;
  }

  get isLastStep(): boolean {
    return this.currentStep === this.stepRefs.length - 1;
  }

  get stepProgress(): string {
    return `Step ${this.currentStep + 1} of ${this.stepRefs.length}`;
  }
}
