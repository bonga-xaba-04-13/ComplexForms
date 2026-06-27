import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { ControlOption, JsonFormControl, LoadedStep } from '../../../models/form-fields';
import { Api } from '../../../service/api';

@Component({
  standalone: true,
  selector: 'app-step-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-form.html',
  styleUrl: './step-form.scss',
})
export class StepForm implements OnChanges {
  @Input() loadedStep: LoadedStep | undefined;
  @Input() isEditing = false;

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
    if (!populates || !this.loadedStep) {
      return;
    }

    const value = (event.target as HTMLSelectElement).value;
    const valueKey = control.optionsSource?.valueKey ?? 'value';
    const selected = (this.dynamicRawData[control.name] ?? []).find(item => item[valueKey] === value);
    if (!selected) {
      return;
    }

    for (const [targetControl, sourceKey] of Object.entries(populates)) {
      this.loadedStep.formGroup.get(targetControl)?.setValue(selected[sourceKey]);
    }
  }

  isInvalid(name: string): boolean {
    const ctrl = this.loadedStep?.formGroup.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
