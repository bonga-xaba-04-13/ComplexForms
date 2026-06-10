import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { LoadedStep } from '../../../models/form-fields';

@Component({
  standalone: true,
  selector: 'app-step-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-form.html',
  styleUrl: './step-form.scss',
})
export class StepForm {
  @Input() loadedStep: LoadedStep | undefined;

  isInvalid(name: string): boolean {
    const ctrl = this.loadedStep?.formGroup.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
