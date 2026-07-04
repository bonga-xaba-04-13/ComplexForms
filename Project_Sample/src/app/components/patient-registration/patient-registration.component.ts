import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControlRendererComponent } from './shared/form-control-renderer.component';
import { FormLoaderService } from './services/form-loader.service';
import { StepperFormDefinition, StepDefinition, Payload } from './models/index';
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
  currentStep = 0;
  completedSteps = new Set<number>();
  forms: FormGroup[] = [];
  steps: StepDefinition[] = [];

  toastMessage = '';
  toastVisible = false;
  toastType: 'success' | 'error' | 'info' = 'success';

  errorModalVisible = false;
  errorModalMessage = '';
  errorModalDetails: string[] = [];

  loadingForms = true;
  loadError = false;
  loadErrorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private formLoaderService: FormLoaderService,
    private dialogRef: MatDialogRef<PatientRegistrationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title?: string }
  ) {}

  ngOnInit() {
    this.loadFormDefinition();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFormDefinition() {
    this.formLoaderService
      .loadPatientRegistrationForms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stepper) => {
          this.initializeSteps(stepper);
          this.loadingForms = false;
          this.loadError = false;
        },
        error: (error) => {
          console.error('Error loading form definition:', error);
          this.loadingForms = false;
          this.loadError = true;
          this.loadErrorMessage = 'Failed to load form. Please try again.';
        },
      });
  }

  retryLoadForms() {
    this.loadingForms = true;
    this.loadError = false;
    this.loadFormDefinition();
  }


  private initializeSteps(stepper: StepperFormDefinition) {
    this.steps = stepper.steps;
    this.forms = stepper.steps.map(() => this.fb.group({}));
  }

  goToStep(stepIndex: number) {
    if (this.isStepAccessible(stepIndex) && this.validateCurrentStep()) {
      this.saveStepData();
      this.currentStep = stepIndex;
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.saveStepData();
      this.currentStep--;
    }
  }

  nextStep() {
    if (this.validateCurrentStep()) {
      this.saveStepData();
      this.completedSteps.add(this.currentStep);
      if (this.currentStep < this.steps.length - 1) {
        this.currentStep++;
      }
    }
  }

  submitForm() {
    if (this.validateCurrentStep()) {
      this.saveStepData();
      const payload = this.buildPayload();
      this.showToast('Form submitted successfully!', 'success');
      console.log('Form Payload:', payload);
      // Here you would send the payload to your backend
    }
  }

  private validateCurrentStep(): boolean {
    const form = this.forms[this.currentStep];
    if (!form.valid) {
      const errors = this.getFormErrors(form);
      this.showErrorModal('Please fill in all required fields', errors);
      return false;
    }
    return true;
  }

  private isCurrentStepComplete(): boolean {
    return this.completedSteps.has(this.currentStep);
  }

  private saveStepData() {
    // Form data is automatically managed by FormGroup
  }

  private buildPayload(): Payload {
    const payload: any = {
      step1: {},
      step2: {},
      step3: {},
      timestamp: new Date().toISOString(),
      completed: true,
    };

    this.forms.forEach((form, index) => {
      const stepKey = `step${index + 1}`;
      payload[stepKey] = form.value;
    });

    return payload;
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

  get currentStepData(): StepDefinition | null {
    return this.steps[this.currentStep] || null;
  }

  get canProceed(): boolean {
    return this.currentStep < this.steps.length - 1;
  }

  get isLastStep(): boolean {
    return this.currentStep === this.steps.length - 1;
  }

  get stepProgress(): string {
    return `Step ${this.currentStep + 1} of ${this.steps.length}`;
  }

  isStepAccessible(stepIndex: number): boolean {
    if (stepIndex <= this.currentStep) return true;
    if (stepIndex === this.currentStep + 1 && this.isCurrentStepComplete()) return true;
    return false;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  getFieldGridClass(field: any): string {
    if (field.type === 'textarea' || field.type === 'checkgroup') {
      return 'form-field full-width';
    }
    return 'form-field';
  }
}
