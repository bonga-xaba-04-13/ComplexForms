import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { JsonFormdata, JsonFormControl } from '../../../models/form-fields';

@Component({
  standalone: true,
  selector: 'app-form',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './form.html',
  styleUrl: './form.scss',
})
export class AppForm implements OnChanges {
  @Input() jsonFormdata: JsonFormdata | undefined;
  @Input() title: string = '';
  @Input() subtitle: string = '';

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['jsonFormdata'] && this.jsonFormdata) {
      this.buildForm();
    }
  }

  buildForm(): void {
    const group: Record<string, any> = {};
    this.jsonFormdata!.controls.forEach((control: JsonFormControl) => {
      const validators =
        control.validators && control.validators['required'] ? [Validators.required] : [];
      group[control.name] = ['', validators];
    });
    this.form = this.fb.group(group);
  }

  isInvalid(name: string): boolean {
    const ctrl = this.form?.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  onSubmit(): void {
    if (this.form?.valid) {
      console.log('Form submitted:', this.form.value);
    } else {
      this.form?.markAllAsTouched();
    }
  }
}
