import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Api } from '../../service/api';
import { JsonFormControl, JsonFormdata, FormStep, MultiStepFormDefinition, LoadedStep } from '../../models/form-fields';
import { JointStepForm } from '../shared/joint-step-form/joint-step-form';

@Component({
  standalone: true,
  selector: 'app-jointcapture',
  imports: [CommonModule, JointStepForm],
  templateUrl: './jointcapture.html',
  styleUrl: './jointcapture.scss',
})
export class Jointcapture implements OnInit {
  steps: FormStep[] = [];
  currentStepIndex = 0;
  loadedSteps: LoadedStep[] = [];
  parentForm!: FormGroup;
  isEditing = false;

  constructor(
    private api: Api,
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<Jointcapture>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.api.getForms(this.data.formUrl).subscribe((resp: MultiStepFormDefinition) => {
      this.steps = resp.steps;
      if (this.steps.length === 0) return;

      const stepRequests = this.steps.map(step => this.api.getForms(step.formUrl));

      forkJoin(stepRequests).subscribe((formDataArray: JsonFormdata[]) => {
        this.buildFormGroup(formDataArray);
      });
    });
  }

  buildFormGroup(formDataArray: JsonFormdata[]): void {
    const subGroups: Record<string, FormGroup> = {};

    this.loadedSteps = this.steps.map((step, i) => {
      const formData = formDataArray[i];

      const stepGroup = this.fb.group({
        user1: this.buildPersonGroup(formData),
        user2: this.buildPersonGroup(formData),
      });
      subGroups[step.id] = stepGroup;

      return { step, formData, formGroup: stepGroup };
    });

    this.parentForm = this.fb.group(subGroups);
  }

  private buildPersonGroup(formData: JsonFormdata): FormGroup {
    const group: Record<string, any> = {};

    formData.controls.forEach((control: JsonFormControl) => {
      const validators = control.validators?.['required'] ? [Validators.required] : [];
      group[control.name] = ['', validators];
    });

    return this.fb.group(group);
  }

  get currentLoadedStep(): LoadedStep | undefined {
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

  onSubmit(): void {
    if (this.parentForm.valid) {
      console.log('Joint capture submitted:', this.parentForm.value);
    } else {
      this.parentForm.markAllAsTouched();
    }
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

  close(): void {
    this.dialogRef.close();
  }
}
