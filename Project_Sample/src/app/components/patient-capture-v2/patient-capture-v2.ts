import { Component, OnInit, HostListener, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DynamicForm } from './dynamic-form/dynamic-form';
import { FormService } from '../../services/form.service';
import { FormGroupRegistry } from './form-groups/form-group-registry';
import { PersonalInfoForm } from './form-groups/personal-info-form/personal-info-form';
import { ContactInfoForm } from './form-groups/contact-info-form/contact-info-form';
import { InsuranceForm } from './form-groups/insurance-form/insurance-form';
import { EmergencyContactsForm } from './form-groups/emergency-contacts-form/emergency-contacts-form';
import { PayloadBuilder } from './payload/payload-builder.service';
import { StepSnapshot, ParticipantPayload } from './payload/payload.types';
import { DraftService } from './services/draft.service';
import { ValidationService } from './services/validation.service';
import { SubmissionService } from './services/submission.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import {
  initializePatientCapture,
  markStepCompleted,
  restorePatientCaptureState,
  setActiveParticipant,
  setCaptureMode,
  setCurrentStep,
  updateCapturedStepData,
} from '../../store/patient-capture/patient-capture.actions';
import {
  AppState,
  PatientCaptureState,
} from '../../store/patient-capture/patient-capture.reducer';
import { selectPatientCaptureState } from '../../store/patient-capture/patient-capture.selectors';

/** Keys of form steps that should never be rendered (removed during minimization). */
const EXCLUDED_FORM_KEYNAMES = new Set([
  'lifestyle_social',
  'medical_history',
  'current_medications',
]);

@Component({
  standalone: true,
  selector: 'app-patient-capture-v2',
  imports: [
    CommonModule,
    DynamicForm,
    PersonalInfoForm,
    ContactInfoForm,
    InsuranceForm,
    EmergencyContactsForm,
  ],
  templateUrl: './patient-capture-v2.html',
  styleUrl: './patient-capture-v2.scss',
})
export class PatientCaptureV2 implements OnInit, OnDestroy {
  LoadedSteps: any[] = [];
  TOTAL = 0;

  currentStep = 0;
  activeParticipant = 0;
  captureMode: 'individual' | 'joint' = 'individual';
  completedSteps = new Set<number>();

  /** Form groups per participant index. Index 0 always exists. */
  participantForms: Record<number, FormGroup[]> = { 0: [] };

  toastMsg = '';
  toastVisible = false;
  errorModalVisible = false;
  errorModalMessage = '';

  @ViewChild('panelsScroll') panelsScroll!: ElementRef<HTMLElement>;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private formService: FormService,
    private payloadBuilder: PayloadBuilder,
    private draftService: DraftService,
    private validationService: ValidationService,
    private submissionService: SubmissionService,
    private dialogRef: MatDialogRef<PatientCaptureV2>,
    @Inject(MAT_DIALOG_DATA) public data: { title?: string },
    private cdr: ChangeDetectorRef,
    private store: Store<AppState>
  ) {
    this.store.select(selectPatientCaptureState)
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: PatientCaptureState) => this.syncUiStateFromStore(state));
  }

  ngOnInit(): void {
    this.loadFormsFromApi();
  }

  // ── UI State Sync from Store ────────────────────────────────────────────

  private syncUiStateFromStore(state: PatientCaptureState): void {
    this.currentStep = state.currentStep;
    this.activeParticipant = state.activeParticipant;
    this.captureMode = state.captureMode;
    this.completedSteps = new Set(state.completedSteps);
    if (state.totalSteps > 0) {
      this.TOTAL = state.totalSteps;
    }
  }

  /** Restore saved draft if available. */
  private restoreDraftIfAvailable(): void {
    const restored = this.draftService.restoreDraft();
    if (restored) {
      // Determine capture mode from restored data
      const hasMultipleParticipants = restored.snapshots.some(s => s.allowDynamicParticipants);
      this.captureMode = hasMultipleParticipants ? 'joint' : 'individual';

      // If joint, build participant-1 forms before applying data
      if (this.captureMode === 'joint') {
        this.buildParticipantFormsForIndex(1);
      }

      this.applyRestoredData(restored);
    }
  }

  private applyRestoredData(restored: any): void {
    restored.snapshots.forEach((snapshot: StepSnapshot) => {
      const idx = this.LoadedSteps.findIndex(s => s.keyname === snapshot.stepName || s.formLabel === snapshot.stepLabel);
      if (idx === -1) return;
      const stepIdx = Math.max(0, idx);

      Object.entries(snapshot.participants).forEach(([pIdx, values]) => {
        const numericIdx = Number(pIdx);
        const forms = this.participantForms[numericIdx]?.[stepIdx];
        if (forms) {
          forms.patchValue(values as Record<string, unknown>);
        }
      });
    });

    const restoredStep = Math.min(restored.currentStep, this.TOTAL - 1);
    this.currentStep = restoredStep;
    this.completedSteps = new Set(restored.completedSteps ?? []);
    this.store.dispatch(restorePatientCaptureState({
      currentStep: restoredStep,
      activeParticipant: this.activeParticipant,
      captureMode: this.captureMode,
      completedSteps: Array.from(this.completedSteps),
      capturedData: this.toCapturedDataMap(),
    }));
    this.showToast('Draft restored', 2500);
  }

  // ── Load Forms ──────────────────────────────────────────────────────────

  private loadFormsFromApi(): void {
    this.formService.loadStepperWithSubForms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Filter out excluded form keynames
          const rawForms = data.forms.filter((f: any) => !EXCLUDED_FORM_KEYNAMES.has(f.keyname));
          this.initializeLoadedSteps(rawForms);
          this.restoreDraftIfAvailable();
        },
        error: (err) => {
          console.error('Error loading forms from API:', err);
          this.showToast('Error loading form definition');
        }
      });
  }

  private initializeLoadedSteps(forms: any[]): void {
    this.LoadedSteps = [];
    this.participantForms = {};

    // Always build participant 0 forms
    this.participantForms[0] = [];
    forms.forEach((form: any) => {
      FormGroupRegistry.logFormTypeDetection(form, form.definition);
      const patientForm = this.buildGroup(form.definition);
      this.participantForms[0].push(patientForm);
      this.LoadedSteps.push(form);
    });

    this.TOTAL = this.LoadedSteps.length;

    this.store.dispatch(initializePatientCapture({
      totalSteps: this.TOTAL,
      currentStep: this.currentStep,
      activeParticipant: this.activeParticipant,
      captureMode: this.captureMode,
      completedSteps: Array.from(this.completedSteps),
      capturedData: this.toCapturedDataMap(),
    }));
    this.cdr.markForCheck();
  }

  /** Build form groups for a given participant index (used when switching to joint mode). */
  private buildParticipantFormsForIndex(participantIndex: number): void {
    this.participantForms[participantIndex] = this.LoadedSteps.map(step =>
      this.buildGroup(step.definition)
    );
  }

  private buildGroup(controls: any[]): FormGroup {
    const group: Record<string, any> = {};
    if (!controls) return this.fb.group(group);

    for (const c of controls) {
      const v = c.validators?.['required'] ? [Validators.required] : [];
      group[c.name] = ['', v];
    }
    return this.fb.group(group);
  }

  // ── Computed Accessors ──────────────────────────────────────────────────

  get currentStepDef(): any {
    return this.LoadedSteps[this.currentStep];
  }

  get activeControls(): any[] {
    return this.currentStepDef?.definition || [];
  }

  /** The FormGroup array for the currently active participant. */
  get activeParticipantForms(): FormGroup[] {
    return this.participantForms[this.activeParticipant] ?? [];
  }

  /** The FormGroup for the current step and active participant. */
  get activeFormGroup(): FormGroup {
    return this.activeParticipantForms[this.currentStep] ?? this.fb.group({});
  }

  /** Available participant indexes — [0] in individual mode, [0,1] in joint mode. */
  get participantIndexes(): number[] {
    return this.captureMode === 'joint' ? [0, 1] : [0];
  }

  /** Whether joint mode is enabled. */
  get isJointMode(): boolean {
    return this.captureMode === 'joint';
  }

  get progressPercent(): number {
    return this.TOTAL === 0 ? 0 : Math.round(((this.currentStep + 1) / this.TOTAL) * 100);
  }

  get isFirstStep(): boolean { return this.currentStep === 0; }
  get isLastStep(): boolean  { return this.currentStep === this.TOTAL - 1; }

  /** Progress badge for a participant tab. */
  getParticipantProgress(participantIndex: number): string {
    const forms = this.participantForms[participantIndex];
    if (!forms) return 'Not started';
    const filled = forms.filter(f => f.dirty).length;
    return filled === 0 ? 'Not started' : `${filled} / ${this.TOTAL} steps`;
  }

  /** Detect which child form component should render this step. */
  getFormGroupType(formDef: any): string {
    if (!formDef) return 'unknown';
    const detection = FormGroupRegistry.identifyFormType(formDef.definition);
    return detection.type;
  }

  // ── Capture Mode ────────────────────────────────────────────────────────

  /** Toggle between individual and joint capture mode. */
  setCaptureMode(mode: 'individual' | 'joint'): void {
    this.captureMode = mode;
    this.activeParticipant = 0;
    this.store.dispatch(setCaptureMode({ captureMode: mode }));

    if (mode === 'joint') {
      // Build participant 1 forms on demand
      if (!this.participantForms[1]) {
        this.buildParticipantFormsForIndex(1);
      }
      this.showToast('Joint mode enabled — fill forms for each participant', 3500);
    } else {
      // Clear participant 1 forms when switching back to individual
      delete this.participantForms[1];
      this.showToast('Switched to individual capture', 2500);
    }
  }

  // ── Participant Switching ───────────────────────────────────────────────

  switchParticipant(index: number): void {
    this.activeParticipant = index;
    this.store.dispatch(setActiveParticipant({ activeParticipant: index }));
    this.scrollTop();
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  goToStep(index: number): void {
    this.currentStep = index;
    this.activeParticipant = 0;
    this.store.dispatch(setCurrentStep({ currentStep: index }));
    this.store.dispatch(setActiveParticipant({ activeParticipant: 0 }));
    this.scrollTop();
  }

  next(): void {
    if (this.isLastStep) return;
    this.completedSteps = new Set([...this.completedSteps, this.currentStep]);
    this.store.dispatch(markStepCompleted({ stepIndex: this.currentStep }));
    this.currentStep++;
    this.store.dispatch(setCurrentStep({ currentStep: this.currentStep }));
    this.activeParticipant = 0;
    this.store.dispatch(setActiveParticipant({ activeParticipant: 0 }));
    this.scrollTop();
  }

  nextStepWithValidation(): void {
    if (this.isLastStep) return;

    const formLabels = this.LoadedSteps.map(s => s.formLabel || 'Unknown');

    // Validate current step for active participant
    const participantForms = this.participantForms[this.activeParticipant];
    if (!participantForms?.[this.currentStep]) {
      this.next();
      return;
    }

    const currentValidation = this.validationService.validateCurrentStep(
      participantForms[this.currentStep],
      this.currentStep,
      formLabels[this.currentStep] || 'Unknown',
      this.activeParticipant
    );

    if (!currentValidation.isValid) {
      this.showErrorModal(
        `Step ${this.currentStep + 1} has errors:\n\n${this.validationService.formatErrorsForDisplay(currentValidation.errors)}\n\nPlease fix these issues before proceeding.`
      );
      participantForms[this.currentStep].markAllAsTouched();
      return;
    }

    // Allow user to continue despite prior step warnings
    const priorStepsValidation = this.validationService.validateParticipantForms(
      participantForms,
      formLabels,
      this.activeParticipant,
      this.currentStep - 1
    );

    if (!priorStepsValidation.isValid) {
      const firstInvalid = priorStepsValidation.firstInvalidStepIndex ?? this.currentStep;
      this.showToast(`⚠️ Step ${firstInvalid + 1} has incomplete fields. Continue anyway?`, 5000);
    }

    this.completedSteps = new Set([...this.completedSteps, this.currentStep]);
    this.store.dispatch(markStepCompleted({ stepIndex: this.currentStep }));
    this.currentStep++;
    this.store.dispatch(setCurrentStep({ currentStep: this.currentStep }));
    this.activeParticipant = 0;
    this.store.dispatch(setActiveParticipant({ activeParticipant: 0 }));
    this.scrollTop();
  }

  previous(): void {
    if (this.isFirstStep) return;
    this.currentStep--;
    this.store.dispatch(setCurrentStep({ currentStep: this.currentStep }));
    this.activeParticipant = 0;
    this.store.dispatch(setActiveParticipant({ activeParticipant: 0 }));
    this.scrollTop();
  }

  private scrollTop(): void {
    this.panelsScroll?.nativeElement?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Field Changes ───────────────────────────────────────────────────────

  onFieldChanged(_event: { fieldName: string; value: any }): void {
    const stepIndex = this.currentStep;
    const allParticipants: Record<number, Record<string, unknown>> = {};

    this.participantIndexes.forEach(idx => {
      allParticipants[idx] = this.participantForms[idx]?.[stepIndex]?.value ?? {};
    });

    this.store.dispatch(updateCapturedStepData({
      stepIndex,
      participants: allParticipants,
      allowDynamicParticipants: this.isJointMode,
      stepName: this.currentStepDef?.keyname || `step_${stepIndex}`,
      stepLabel: this.currentStepDef?.formLabel || `Step ${stepIndex + 1}`,
      isComplete: this.isCurrentStepComplete(stepIndex),
    }));
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  saveDraft(): void {
    try {
      const snapshots = this.toStepSnapshots();
      this.draftService.saveDraft(snapshots, this.captureMode, this.buildDraftMetadata());
      this.showToast('Draft saved successfully', 2500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed to save draft: ${errorMsg}`, 3500);
      console.error('Draft save failed:', error);
    }
  }

  saveSimpleDraft(): void {
    try {
      const snapshots = this.toStepSnapshots();
      this.draftService.saveSimpleDraft(snapshots, this.captureMode);
      this.showToast('Draft saved', 2000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.showToast(`Failed to save draft: ${errorMsg}`, 3500);
      console.error('Draft save failed:', error);
    }
  }

  /** Convert internal form state to StepSnapshot array for payload building. */
  private toStepSnapshots(): StepSnapshot[] {
    return this.LoadedSteps.map((step, index) => ({
      stepName: step.keyname || `step_${index}`,
      stepLabel: step.formLabel,
      allowDynamicParticipants: this.isJointMode,
      participants: this.participantIndexes.reduce((acc, idx) => {
        acc[idx] = this.participantForms[idx]?.[index]?.value || {};
        return acc;
      }, {} as Record<number, Record<string, unknown>>)
    }));
  }

  private toCapturedDataMap(): Record<number, {
    participants: Record<number, Record<string, unknown>>;
    allowDynamicParticipants: boolean;
    stepName?: string;
    stepLabel?: string;
    isComplete?: boolean;
  }> {
    return this.LoadedSteps.reduce((acc, step, index) => {
      const participants: Record<number, Record<string, unknown>> = {};
      this.participantIndexes.forEach(idx => {
        participants[idx] = this.participantForms[idx]?.[index]?.value ?? {};
      });
      acc[index] = {
        participants,
        allowDynamicParticipants: !!step.allowDynamicParticipants || this.isJointMode,
        stepName: step.keyname || `step_${index}`,
        stepLabel: step.formLabel || `Step ${index + 1}`,
        isComplete: this.isCurrentStepComplete(index),
      };
      return acc;
    }, {} as Record<number, { participants: Record<number, Record<string, unknown>>; allowDynamicParticipants: boolean; stepName?: string; stepLabel?: string; isComplete?: boolean; }>);
  }

  private isCurrentStepComplete(stepIndex: number): boolean {
    let hasAnyData = false;
    this.participantIndexes.forEach(idx => {
      const values = this.participantForms[idx]?.[stepIndex]?.value ?? {};
      if (Object.values(values).some(v => v !== null && v !== undefined && v !== '')) {
        hasAnyData = true;
      }
    });
    return hasAnyData;
  }

  private buildDraftMetadata() {
    return {
      currentStep: this.currentStep,
      completedSteps: Array.from(this.completedSteps),
      totalSteps: this.TOTAL,
    };
  }

  /** Submit the entire form — validate, POST via HTTP, close dialog on success. */
  submitForm(): void {
    // Validate participant 0 fully
    const p0Forms = this.participantForms[0];
    const allValid = p0Forms.every(f => f.valid);
    if (!allValid) {
      p0Forms.forEach(f => f.markAllAsTouched());
      this.showToast('Please complete all required fields');
      return;
    }

    // In joint mode also validate participant 1 (skip empty stubs)
    if (this.isJointMode && this.participantForms[1]) {
      const p1Forms = this.participantForms[1];
      const p1Invalid = p1Forms.some(f => {
        if (Object.keys(f.value).every(k => !f.value[k])) return false; // skip empty stubs
        return !f.valid;
      });
      if (p1Invalid) {
        p1Forms.forEach(f => f.markAllAsTouched());
        this.showToast('Please complete partner form fields');
        return;
      }
    }

    // Build payloads
    const snapshots = this.toStepSnapshots();
    const formatA = this.payloadBuilder.buildStepGroupedPayload(snapshots);
    const formatB: ParticipantPayload = this.payloadBuilder.buildParticipantPayload(snapshots);

    console.log('Submitting patient intake...', { backend: formatA, audit: formatB });

    // Demo POST via SubmissionService (logs body to console automatically)
    this.submissionService.submitIntake({ backend: formatA, audit: formatB }).subscribe({
      next: () => {
        this.showToast('Patient record submitted successfully!');
        setTimeout(() => this.dialogRef.close({ backend: formatA, audit: formatB }), 1200);
      },
      error: (err) => {
        // Even on network failure, the payload was logged by SubmissionService
        console.warn('POST failed (endpoint may not exist locally):', err);
        this.showToast('Submission failed — payload was logged to Console for inspection', 5000);
        // Close anyway so user can see result in dev
        setTimeout(() => this.dialogRef.close({ backend: formatA, audit: formatB }), 1500);
      }
    });
  }

  /** Enhanced submit with detailed validation feedback before POST. */
  submitFormWithFeedback(): void {
    const formLabels = this.LoadedSteps.map(s => s.formLabel || 'Unknown');

    // Validate participant 0
    const p0Validation = this.validationService.validateParticipantForms(
      this.participantForms[0] ?? [],
      formLabels,
      0
    );

    if (!p0Validation.isValid) {
      this.participantForms[0].forEach(f => f.markAllAsTouched());
      this.showErrorModal(
        `Please fix the following errors before submitting:\n\n${this.validationService.formatErrorsForDisplay(p0Validation.errors)}`
      );
      return;
    }

    // Validate participant 1 if joint mode
    if (this.isJointMode && this.participantForms[1]) {
      const p1Validation = this.validationService.validateParticipantForms(
        this.participantForms[1],
        formLabels,
        1
      );
      if (p1Validation.errors.length > 0) {
        this.participantForms[1].forEach(f => f.markAllAsTouched());
        this.showErrorModal(
          `Please fix partner form errors before submitting:\n\n${this.validationService.formatErrorsForDisplay(p1Validation.errors)}`
        );
        return;
      }
    }

    // All valid — submit via HTTP
    this.submitForm();
  }

  close(): void {
    this.dialogRef.close();
  }

  showToast(msg: string, ms = 2800): void {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => { this.toastVisible = false }, ms);
  }

  showErrorModal(message: string): void {
    this.errorModalMessage = message;
    this.errorModalVisible = true;
  }

  closeErrorModal(): void {
    this.errorModalVisible = false;
  }

  goToStepFromError(stepIndex: number): void {
    this.goToStep(stepIndex);
    this.closeErrorModal();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
