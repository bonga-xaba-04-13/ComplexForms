import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { FormFieldControl } from '../models/index';

@Component({
  selector: 'app-form-control-renderer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div [formGroup]="form" class="form-group">
      <!-- Text, Email, Tel, Number, Date inputs -->
      <ng-container *ngIf="['text', 'email', 'tel', 'number', 'date'].includes(control.type)">
        <label [for]="control.name" class="form-label">
          {{ control.label }}
          <span *ngIf="control.required" class="required">*</span>
        </label>
        <input
          [type]="control.type"
          [id]="control.name"
          [formControlName]="control.name"
          [placeholder]="control.placeholder || ''"
          [disabled]="control.disabled || false"
          class="form-input"
        />
      </ng-container>

      <!-- Textarea -->
      <ng-container *ngIf="control.type === 'textarea'">
        <label [for]="control.name" class="form-label">
          {{ control.label }}
          <span *ngIf="control.required" class="required">*</span>
        </label>
        <textarea
          [id]="control.name"
          [formControlName]="control.name"
          [placeholder]="control.placeholder || ''"
          [disabled]="control.disabled || false"
          [rows]="control.rows || 3"
          class="form-textarea"
        ></textarea>
      </ng-container>

      <!-- Select dropdown -->
      <ng-container *ngIf="control.type === 'select'">
        <label [for]="control.name" class="form-label">
          {{ control.label }}
          <span *ngIf="control.required" class="required">*</span>
        </label>
        <select
          [id]="control.name"
          [formControlName]="control.name"
          [disabled]="control.disabled || false"
          class="form-select"
        >
          <option value="">Select {{ control.label }}</option>
          <option *ngFor="let opt of control.options" [value]="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </ng-container>

      <!-- Checkbox (single) -->
      <ng-container *ngIf="control.type === 'checkbox'">
        <div class="checkbox-item">
          <input
            type="checkbox"
            [id]="control.name"
            [formControlName]="control.name"
            [disabled]="control.disabled || false"
            class="form-checkbox"
          />
          <label [for]="control.name" class="checkbox-label">
            {{ control.label }}
            <span *ngIf="control.required" class="required">*</span>
          </label>
        </div>
      </ng-container>

      <!-- Checkgroup (multiple checkboxes) -->
      <ng-container *ngIf="control.type === 'checkgroup'">
        <label class="form-label">
          {{ control.label }}
          <span *ngIf="control.required" class="required">*</span>
        </label>
        <div class="checkgroup-container">
          <div *ngFor="let opt of control.options" class="checkbox-item">
            <input
              type="checkbox"
              [id]="control.name + '_' + opt.value"
              [value]="opt.value"
              (change)="onCheckgroupChange($event, control.name, opt.value)"
              [disabled]="control.disabled || false"
              class="form-checkbox"
            />
            <label [for]="control.name + '_' + opt.value" class="checkbox-label">
              {{ opt.label }}
            </label>
          </div>
        </div>
      </ng-container>

      <!-- Radio buttons -->
      <ng-container *ngIf="control.type === 'radio'">
        <label class="form-label">
          {{ control.label }}
          <span *ngIf="control.required" class="required">*</span>
        </label>
        <div class="radio-group">
          <div *ngFor="let opt of control.options" class="radio-item">
            <input
              type="radio"
              [id]="control.name + '_' + opt.value"
              [formControlName]="control.name"
              [value]="opt.value"
              [disabled]="control.disabled || false"
              class="form-radio"
            />
            <label [for]="control.name + '_' + opt.value" class="radio-label">
              {{ opt.label }}
            </label>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #1f2937;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .required {
      color: #dc2626;
    }

    .form-input,
    .form-textarea,
    .form-select {
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      font-size: 14px;
      color: #1f2937;
      background-color: #ffffff;
      font-family: inherit;
      transition: border-color 0.2s ease;
      border-radius: 4px;
    }

    .form-input:focus,
    .form-textarea:focus,
    .form-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.1);
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'%3e%3c/path%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 8px center;
      background-size: 20px;
      padding-right: 32px;
    }

    .checkbox-item,
    .radio-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .form-checkbox,
    .form-radio {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #1e3a8a;
    }

    .checkbox-label,
    .radio-label {
      font-size: 14px;
      font-weight: 400;
      color: #1f2937;
      cursor: pointer;
    }

    .checkgroup-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-top: 8px;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }
  `]
})
export class FormControlRendererComponent implements OnInit {
  @Input() control!: FormFieldControl;
  @Input() form!: FormGroup;

  ngOnInit() {
    if (!this.form.get(this.control.name)) {
      this.form.addControl(this.control.name, this.createControl());
    }
  }

  private createControl() {
    const validators = [];
    if (this.control.required) {
      validators.push(Validators.required);
    }

    return new FormControl(
      this.control.value || '',
      validators
    );
  }

  onCheckgroupChange(event: any, controlName: string, value: any) {
    const control = this.form.get(controlName);
    if (!control) return;

    let currentValues = control.value || [];
    if (!Array.isArray(currentValues)) {
      currentValues = [];
    }

    if (event.target.checked) {
      if (!currentValues.includes(value)) {
        currentValues.push(value);
      }
    } else {
      currentValues = currentValues.filter((v: any) => v !== value);
    }

    control.setValue(currentValues);
  }
}
