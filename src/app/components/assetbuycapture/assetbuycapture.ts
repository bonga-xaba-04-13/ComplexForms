import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Api } from '../../service/api';
import { JsonFormControl, JsonFormdata, FormStep, MultiStepFormDefinition } from '../../models/form-fields';
import { AssetStepForm, AssetLoadedStep } from '../shared/asset-step-form/asset-step-form';

@Component({
  standalone: true,
  selector: 'app-assetbuycapture',
  imports: [CommonModule, AssetStepForm],
  templateUrl: './assetbuycapture.html',
  styleUrl: './assetbuycapture.scss',
})
export class Assetbuycapture implements OnInit {
  steps: FormStep[] = [];
  currentStepIndex = 0;
  loadedSteps: AssetLoadedStep[] = [];
  parentForm!: FormGroup;
  isEditing = false;

  constructor(
    private api: Api,
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<Assetbuycapture>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.api.getForms(this.data.formUrl).subscribe((resp: MultiStepFormDefinition) => {
      this.steps = resp.steps;
      if (this.steps.length === 0) return;

      const stepRequests = this.steps.map(step => this.api.getForms(step.formUrl));

      forkJoin(stepRequests).subscribe((formDataArray: JsonFormdata[]) => {
        this.buildFormGroups(formDataArray);
      });
    });
  }

  buildFormGroups(formDataArray: JsonFormdata[]): void {
    const subGroups: Record<string, FormGroup> = {};

    this.loadedSteps = this.steps.map((step, i) => {
      const formData = formDataArray[i];
      const isDynamic = !!formData.allowDynamicParticipants;

      const formGroup = isDynamic
        ? this.fb.group({
            participant1: this.buildGroup(formData),
            participant2: this.buildGroup(formData),
          })
        : this.buildGroup(formData);

      subGroups[step.id] = formGroup;

      return { step, formData, isDynamic, formGroup, activeParticipant: 'participant1' as const };
    });

    this.parentForm = this.fb.group(subGroups);
  }

  private buildGroup(formData: JsonFormdata): FormGroup {
    const group: Record<string, any> = {};

    formData.controls.forEach((control: JsonFormControl) => {
      const validators = control.validators?.['required'] ? [Validators.required] : [];
      group[control.name] = ['', validators];
    });

    return this.fb.group(group);
  }

  get isJoint(): boolean {
    return this.parentForm?.get('scenarioStep.captureType')?.value === 'joint';
  }

  get currentLoadedStep(): AssetLoadedStep | undefined {
    return this.loadedSteps[this.currentStepIndex];
  }

  get currentStep(): FormStep | undefined {
    return this.steps[this.currentStepIndex];
  }

  get isFirstStep(): boolean {
    return this.currentStepIndex === 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  get progressPercent(): number {
    if (this.steps.length === 0) return 0;
    return Math.round(((this.currentStepIndex + 1) / this.steps.length) * 100);
  }

  get allStepsComplete(): boolean {
    if (!this.parentForm || this.loadedSteps.length === 0) return false;

    return this.loadedSteps.every(loadedStep => {
      if (loadedStep.isDynamic) {
        const participant1 = loadedStep.formGroup.get('participant1');
        const participant2 = loadedStep.formGroup.get('participant2');
        return !!participant1?.valid && (!this.isJoint || !!participant2?.valid);
      }
      return loadedStep.formGroup.valid;
    });
  }

  loadStep(index: number): void {
    this.currentStepIndex = index;
  }

  previous(): void {
    if (!this.isFirstStep) {
      this.currentStepIndex--;
    }
  }

  next(): void {
    if (!this.isLastStep) {
      this.currentStepIndex++;
    }
  }

  onDraft(): void {
    console.log('Asset Buy Capture draft saved:', this.parentForm.getRawValue());
  }

  onSubmit(): void {
    if (this.allStepsComplete) {
      console.log('Asset Buy Capture submitted:', this.buildPayload());
    } else {
      this.loadedSteps.forEach(loadedStep => loadedStep.formGroup.markAllAsTouched());
    }
  }

  private buildPayload(): Record<string, any> {
    const value = this.parentForm.getRawValue();
    const payload: Record<string, any> = {};

    this.loadedSteps.forEach(loadedStep => {
      const stepValue = value[loadedStep.step.id];
      payload[loadedStep.step.id] = loadedStep.isDynamic && !this.isJoint
        ? { participant1: stepValue.participant1 }
        : stepValue;
    });

    return payload;
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

  close(): void {
    this.dialogRef.close();
  }
}
