import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { JsonFormControl } from '../../../models/form-fields';

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
  @Input() isPartner = false;
  @Input() isEditing = true;

  @Output() maritalChanged = new EventEmitter<string>();

  ngOnChanges(): void {}

  isInvalid(name: string): boolean {
    const ctrl = this.formGroup?.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  onRadioChange(control: JsonFormControl, value: string): void {
    if (control.name.endsWith('maritalStatus')) {
      this.maritalChanged.emit(value);
    }
  }

  isSpan2(control: JsonFormControl): boolean {
    return control.span2 === true || control.type === 'textarea' || control.type === 'check';
  }
}
