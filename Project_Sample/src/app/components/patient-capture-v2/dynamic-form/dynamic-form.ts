import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { JsonFormControl, ControlOption } from '../../../models/form-fields';

@Component({
  standalone: true,
  selector: 'app-dynamic-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dynamic-form.html',
  styleUrl: './dynamic-form.scss',
})
export class DynamicForm implements OnChanges {
  @Input() controls: JsonFormControl[] = [];
  @Input() formGroup!: FormGroup;
  @Input() stepLabel = '';
  @Input() stepDescription = '';
  @Input() participantIndex = 0;
  @Input() isEditing = true;

  suggestionMap: Record<string, ControlOption[]> = {};
  activeCombobox: string | null = null;

  ngOnChanges(): void {
    this.suggestionMap = {};
    this.activeCombobox = null;
  }

  isInvalid(name: string): boolean {
    const ctrl = this.formGroup?.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  isSpan2(control: JsonFormControl): boolean {
    return control.span2 === true || control.type === 'textarea' || control.type === 'check';
  }

  /** No-op: maritalStatus radio changes no longer emit events. Kept for backward compat. */
  onRadioChange(_control: JsonFormControl, _value: string): void {
    // Intentionally blank — used by template but no longer needed
  }

  onComboboxInput(control: JsonFormControl, value: string): void {
    const min = control.minChars ?? 3;
    if (value.length < min) {
      this.suggestionMap[control.name] = [];
      this.activeCombobox = null;
      return;
    }
    const q = value.toLowerCase();
    this.suggestionMap[control.name] = (control.options ?? [])
      .filter(o => o.label.toLowerCase().includes(q))
      .slice(0, 8);
    this.activeCombobox = control.name;
  }

  selectSuggestion(control: JsonFormControl, opt: ControlOption): void {
    this.formGroup.get(control.name)?.setValue(opt.value);
    this.suggestionMap[control.name] = [];
    this.activeCombobox = null;
    if (control.optionsSource?.populates) {
      for (const [target, key] of Object.entries(control.optionsSource.populates)) {
        if (opt[key] !== undefined) {
          this.formGroup.get(target)?.setValue(opt[key]);
        }
      }
    }
  }

  closeSuggestions(name: string): void {
    setTimeout(() => {
      if (this.activeCombobox === name) {
        this.activeCombobox = null;
        this.suggestionMap[name] = [];
      }
    }, 180);
  }
}
