import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { LoadedStep } from '../../../models/stepper-fields';

@Component({
  standalone: true,
  selector: 'app-step-renderer',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-renderer.html',
  styleUrl: './step-renderer.scss',
})
export class StepRenderer {
  @Input() loadedStep: LoadedStep | undefined;

  isInvalid(name: string): boolean {
    const ctrl = this.loadedStep?.formGroup.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
