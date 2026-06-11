import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ControlOption, FormStep, JsonFormControl, JsonFormdata } from '../../../models/form-fields';
import { Api } from '../../../service/api';
import { forkJoin } from 'rxjs';

export type ParticipantKey = 'participant1' | 'participant2';

export interface AssetLoadedStep {
  step: FormStep;
  formData: JsonFormdata;
  isDynamic: boolean;
  formGroup: FormGroup;
  activeParticipant: ParticipantKey;
}

export const ASSET_PARTICIPANTS: { key: ParticipantKey; label: string }[] = [
  { key: 'participant1', label: 'Participant 1' },
  { key: 'participant2', label: 'Participant 2' },
];

@Component({
  standalone: true,
  selector: 'app-asset-step-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './asset-step-form.html',
  styleUrl: './asset-step-form.scss',
})
export class AssetStepForm implements OnChanges {
  @Input() loadedStep: AssetLoadedStep | undefined;
  @Input() isJoint = false;
  @Input() isEditing = false;

  readonly participants = ASSET_PARTICIPANTS;

  dynamicOptions: Record<string, ControlOption[]> = {};
  private dynamicRawData: Record<string, any[]> = {};

  constructor(private api: Api) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loadedStep']) {
      this.loadDynamicOptions();
    }
  }

  private loadDynamicOptions(): void {
    const controls = this.loadedStep?.formData.controls.filter(c => c.type === 'select' && c.optionsSource) ?? [];
    if (controls.length === 0) {
      return;
    }

    const requests = controls.reduce((acc, control) => {
      acc[control.name] = this.api.getOptions(control.optionsSource!.endpoint);
      return acc;
    }, {} as Record<string, ReturnType<Api['getOptions']>>);

    forkJoin(requests).subscribe(results => {
      for (const control of controls) {
        const data: any[] = results[control.name] ?? [];
        const valueKey = control.optionsSource?.valueKey ?? 'value';
        const labelKey = control.optionsSource?.labelKey ?? 'label';
        this.dynamicRawData[control.name] = data;
        this.dynamicOptions[control.name] = data.map(item => ({
          ...item,
          value: item[valueKey],
          label: item[labelKey],
        }));
      }
    });
  }

  optionsFor(control: JsonFormControl): ControlOption[] {
    return control.optionsSource ? (this.dynamicOptions[control.name] ?? []) : (control.options ?? []);
  }

  onSelectChange(control: JsonFormControl, event: Event): void {
    const populates = control.optionsSource?.populates;
    if (!populates || !this.activeGroup) {
      return;
    }

    const value = (event.target as HTMLSelectElement).value;
    const valueKey = control.optionsSource?.valueKey ?? 'value';
    const selected = (this.dynamicRawData[control.name] ?? []).find(item => item[valueKey] === value);
    if (!selected) {
      return;
    }

    for (const [targetControl, sourceKey] of Object.entries(populates)) {
      this.activeGroup.get(targetControl)?.setValue(selected[sourceKey]);
    }
  }

  get activeGroup(): FormGroup | undefined {
    if (!this.loadedStep) return undefined;
    if (this.loadedStep.isDynamic) {
      return this.loadedStep.formGroup.get(this.loadedStep.activeParticipant) as FormGroup;
    }
    return this.loadedStep.formGroup;
  }

  setParticipant(key: ParticipantKey): void {
    if (this.loadedStep) {
      this.loadedStep.activeParticipant = key;
    }
  }

  isInvalid(name: string): boolean {
    const ctrl = this.activeGroup?.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
