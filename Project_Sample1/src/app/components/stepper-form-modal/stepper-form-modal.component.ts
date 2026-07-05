import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormService } from '../../services/form.service';
import { FormControlRendererComponent } from '../form-control-renderer/form-control-renderer.component';
import { CaptureMode, Participant, resolveParticipants } from '../../models/capture-mode.model';
import { buildSubmitPayload } from '../../services/payload-builder';

interface LoadedStep {
  formLabel: string;
  formDescription: string;
  isDynamic: boolean;
  controls: any[];
  participantForms: FormGroup[];
  formKeyName: string;
}

@Component({
  selector: 'app-stepper-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    FormControlRendererComponent,
  ],
  templateUrl: './stepper-form-modal.component.html',
  styleUrls: ['./stepper-form-modal.component.scss'],
})
export class StepperFormModalComponent implements OnInit {
  loadedSteps: LoadedStep[] = [];
  currentStepIndex = 0;
  activeParticipantIndex = 0;
  isLoading = true;
  isSubmitting = false;
  stepperFormKey = 'patient_intake_stepper';
  stepperFormLabel = '';
  stepperFormDescription = '';
  captureMode: CaptureMode = 'single';
  participants: Participant[] = [];

  constructor(
    public dialogRef: MatDialogRef<StepperFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formService: FormService,
    private fb: FormBuilder
  ) {
    this.captureMode = data?.captureMode || 'single';
    this.participants = resolveParticipants(this.captureMode);
  }

  ngOnInit(): void {
    this.loadStepperForm();
  }

  loadStepperForm(): void {
    this.isLoading = true;
    this.formService.getStepperForm(this.stepperFormKey).subscribe({
      next: (stepperFormData) => {
        this.stepperFormLabel = stepperFormData.formLabel;
        this.stepperFormDescription = stepperFormData.formDescription;
        this.loadSubForms(stepperFormData.definition);
      },
      error: (error) => {
        console.error('Error loading stepper form:', error);
        this.isLoading = false;
      },
    });
  }

  loadSubForms(stepDefinitions: any[]): void {
    const subFormRequests = stepDefinitions.map((step) =>
      this.formService.getFormDefinition(step.form_keyname).pipe(
        catchError((err) => {
          console.error('Error loading subform:', err);
          return of(null);
        })
      )
    );

    forkJoin(subFormRequests).subscribe({
      next: (results) => {
        results.forEach((formData) => {
          if (formData) {
            const loadedStep = this.createLoadedStep(formData);
            this.loadedSteps.push(loadedStep);
          }
        });
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  createLoadedStep(formData: any): LoadedStep {
    const isDynamic = formData.allowDynamicParticipants || false;
    const instanceCount = isDynamic && this.captureMode === 'joint' ? this.participants.length : 1;

    const participantForms: FormGroup[] = [];
    for (let i = 0; i < instanceCount; i++) {
      participantForms.push(this.createFormGroup(formData.definition));
    }

    return {
      formLabel: formData.formLabel,
      formDescription: formData.formDescription,
      isDynamic,
      controls: formData.definition || [],
      participantForms,
      formKeyName: formData.formKeyname,
    };
  }

  createFormGroup(controls: any[]): FormGroup {
    const formGroupConfig: any = {};
    controls.forEach((control) => {
      const validators = [];
      if (control.validators?.required) {
        validators.push(Validators.required);
      }
      formGroupConfig[control.name] = new FormControl('', validators);
    });
    return this.fb.group(formGroupConfig);
  }

  goToNextStep(): void {
    if (this.currentStepIndex < this.loadedSteps.length - 1) {
      this.currentStepIndex++;
    }
  }

  goToPreviousStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
    }
  }

  submitForm(): void {
    if (!this.isFormValid() || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const payload = buildSubmitPayload(
      this.loadedSteps,
      this.captureMode,
      this.participants
    );

    // Simulate processing delay for better UX feedback
    setTimeout(() => {
      this.dialogRef.close(payload);
    }, 300);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  getCurrentStep(): LoadedStep | null {
    return this.loadedSteps[this.currentStepIndex] || null;
  }

  getProgressPercentage(): number {
    if (this.loadedSteps.length === 0) return 0;
    return ((this.currentStepIndex + 1) / this.loadedSteps.length) * 100;
  }

  isFirstStep(): boolean {
    return this.currentStepIndex === 0;
  }

  isLastStep(): boolean {
    return this.currentStepIndex === this.loadedSteps.length - 1;
  }

  getActiveFormGroup(step: LoadedStep): FormGroup {
    const index = this.shouldShowParticipantSwitcher(step) ? this.activeParticipantIndex : 0;
    return step.participantForms[Math.min(index, step.participantForms.length - 1)];
  }

  shouldShowParticipantSwitcher(step: LoadedStep): boolean {
    return step.isDynamic && this.captureMode === 'joint';
  }

  setActiveParticipant(index: number): void {
    if (index >= 0 && index < this.participants.length) {
      this.activeParticipantIndex = index;
    }
  }

  isFormValid(): boolean {
    return this.loadedSteps.every((step) =>
      step.participantForms.every((form) => form.valid)
    );
  }
}
