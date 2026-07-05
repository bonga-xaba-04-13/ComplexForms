import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-form-control-renderer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './form-control-renderer.component.html',
  styleUrls: ['./form-control-renderer.component.scss'],
})
export class FormControlRendererComponent {
  @Input() formGroup!: FormGroup;
  @Input() controls: any[] = [];
  @Input() controlRows: any[][] = [];

  getErrorMessage(control: any): string {
    const formControl = this.formGroup.get(control.name);
    if (formControl?.hasError('required')) {
      return `${control.label} is required`;
    }
    return '';
  }

  isRequired(control: any): boolean {
    return control.validators?.required === true;
  }

  isFullWidthRow(row: any[]): boolean {
    return row.length === 1 && this.isFullWidthControl(row[0]);
  }

  isFullWidthControl(control: any): boolean {
    const fullWidthTypes = ['textarea', 'checkbox', 'radio'];
    return fullWidthTypes.includes(control.type);
  }
}
