import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Api } from '../../service/api';
import { LoadedStep, StepperConfig } from '../../models/stepper-fields';
import { JsonFormControl, JsonFormdata } from '../../models/form-fields';
import { StepRenderer } from './step-renderer/step-renderer';

@Component({
  standalone: true,
  selector: 'app-mutli-step',
  imports: [CommonModule, StepRenderer],
  templateUrl: './mutli-step.html',
  styleUrl: './mutli-step.scss',
})
export class MutliStep implements OnInit {
  loading = false;
  stepperConfig!: StepperConfig;
  loadedSteps: LoadedStep[] = [];
  currentStepIndex = 0;

  constructor(
    private apiService: Api,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.apiService.getForms(this.data.formUrl).subscribe({
      next: (resp: StepperConfig) => {
        this.stepperConfig = resp;

        const formsRequests = resp.steps.map(step =>
          this.apiService.getForms(step.formUrl)
        );

        forkJoin(formsRequests).subscribe({
          next: (formJsonArray: JsonFormdata[]) => {
            this.loadedSteps = resp.steps.map((step, index) => {
              const json = formJsonArray[index];
              return {
                config: step,
                formJson: json,
                formGroup: this.buildFormGroup(json),
                rows: this.getControlRows(json.controls ?? []),
              };
            });
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: err => {
            console.error('Failed to load step forms:', err);
            this.loading = false;
          },
        });
      },
      error: err => {
        console.error('Failed to load stepper config:', err);
        this.loading = false;
      },
    });
  }

  private buildFormGroup(formData: JsonFormdata): FormGroup {
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

  get isFirstStep(): boolean {
    return this.currentStepIndex === 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.loadedSteps.length - 1;
  }

  goToStep(index: number): void {
    this.currentStepIndex = index;
  }

  previous(): void {
    if (!this.isFirstStep) this.currentStepIndex--;
  }

  next(): void {
    if (!this.isLastStep) this.currentStepIndex++;
  }

  getControlRows(controls: any[]): any[][] {
    if (!controls) return [];

    const visible = controls.filter(c => !c.hidden);
    const rows: any[][] = [];

    for (let i = 0; i < visible.length; i++) {
      const control = visible[i];
      if (control.type === 'textarea') {
        rows.push([control]);
      } else {
        const next = visible[i + 1];
        if (next && next.type !== 'textarea') {
          rows.push([control, next]);
          i++;
        } else {
          rows.push([control]);
        }
      }
    }
    return rows;
  }
}
