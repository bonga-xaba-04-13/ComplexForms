import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

export interface ValidationError {
  stepIndex: number;
  stepLabel: string;
  fieldName: string;
  errorType: string;
  message: string;
  participantType: 'patient' | 'partner';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  firstInvalidStepIndex?: number;
  summary: string;
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {

  /**
   * Get error message for a specific validator type
   */
  private getErrorMessage(fieldName: string, errorType: string): string {
    const formattedFieldName = this.formatFieldName(fieldName);

    const errorMessages: Record<string, string> = {
      'required': `${formattedFieldName} is required`,
      'email': `${formattedFieldName} must be a valid email address`,
      'pattern': `${formattedFieldName} format is invalid`,
      'minlength': `${formattedFieldName} is too short`,
      'maxlength': `${formattedFieldName} is too long`,
      'min': `${formattedFieldName} value is too low`,
      'max': `${formattedFieldName} value is too high`,
    };

    return errorMessages[errorType] || `${formattedFieldName} is invalid`;
  }

  /**
   * Convert camelCase or snake_case field names to readable format
   */
  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .trim();
  }

  /**
   * Validate a single FormGroup and return field-level errors
   */
  private validateFormGroup(
    formGroup: FormGroup,
    stepIndex: number,
    stepLabel: string,
    participantType: 'patient' | 'partner' = 'patient'
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!formGroup || formGroup.status === 'INVALID') {
      Object.keys(formGroup.controls).forEach(fieldName => {
        const control = formGroup.get(fieldName);

        if (control && control.invalid && control.errors) {
          Object.keys(control.errors).forEach(errorType => {
            errors.push({
              stepIndex,
              stepLabel,
              fieldName,
              errorType,
              message: this.getErrorMessage(fieldName, errorType),
              participantType
            });
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validate all patient forms (current + prior steps)
   */
  validateAllPatientForms(
    patientForms: FormGroup[],
    formLabels: string[],
    validateUpToStep?: number
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const upTo = validateUpToStep ?? patientForms.length - 1;

    for (let i = 0; i <= upTo && i < patientForms.length; i++) {
      const stepErrors = this.validateFormGroup(
        patientForms[i],
        i,
        formLabels[i] || `Step ${i + 1}`,
        'patient'
      );
      errors.push(...stepErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      firstInvalidStepIndex: errors.length > 0 ? errors[0].stepIndex : undefined,
      summary: this.generateSummary(errors)
    };
  }

  /**
   * Validate partner forms (current + prior steps)
   */
  validateAllPartnerForms(
    partnerForms: FormGroup[],
    formLabels: string[],
    validateUpToStep?: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const upTo = validateUpToStep ?? partnerForms.length - 1;

    for (let i = 0; i <= upTo && i < partnerForms.length; i++) {
      const formValue = partnerForms[i].value;
      // Only validate if partner form has values (was filled in)
      if (Object.keys(formValue).some(key => formValue[key])) {
        const stepErrors = this.validateFormGroup(
          partnerForms[i],
          i,
          formLabels[i] || `Step ${i + 1}`,
          'partner'
        );
        errors.push(...stepErrors);
      }
    }

    return errors;
  }

  /**
   * Validate current step only
   */
  validateCurrentStep(
    formGroup: FormGroup,
    stepIndex: number,
    stepLabel: string,
    participantType: 'patient' | 'partner' = 'patient'
  ): ValidationResult {
    const errors = this.validateFormGroup(formGroup, stepIndex, stepLabel, participantType);

    return {
      isValid: errors.length === 0,
      errors,
      firstInvalidStepIndex: errors.length > 0 ? stepIndex : undefined,
      summary: this.generateSummary(errors)
    };
  }

  /**
   * Generate human-readable summary of validation errors
   */
  private generateSummary(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return 'All fields are valid';
    }

    const groupedByStep = this.groupErrorsByStep(errors);
    const stepSummaries = Object.entries(groupedByStep)
      .map(([label, stepErrors]) => {
        const fieldList = stepErrors
          .map(e => this.formatFieldName(e.fieldName))
          .filter((value, index, self) => self.indexOf(value) === index)
          .join(', ');
        return `${label}: ${fieldList}`;
      });

    if (stepSummaries.length <= 3) {
      return stepSummaries.join(' | ');
    } else {
      return `${stepSummaries.slice(0, 2).join(' | ')} + ${stepSummaries.length - 2} more`;
    }
  }

  /**
   * Group errors by step label for display
   */
  private groupErrorsByStep(errors: ValidationError[]): Record<string, ValidationError[]> {
    return errors.reduce((acc, error) => {
      const key = error.stepLabel;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);
  }

  /**
   * Format errors for display in a modal/dialog
   */
  formatErrorsForDisplay(errors: ValidationError[]): string {
    if (errors.length === 0) return 'No errors';

    const grouped = this.groupErrorsByStep(errors);
    const lines: string[] = [];

    Object.entries(grouped).forEach(([stepLabel, stepErrors]) => {
      lines.push(`${stepLabel}:`);
      const uniqueErrors = stepErrors.filter((e, i, arr) =>
        arr.findIndex(el => el.fieldName === e.fieldName && el.errorType === e.errorType) === i
      );
      uniqueErrors.forEach(error => {
        lines.push(`  • ${error.message}`);
      });
      lines.push('');
    });

    return lines.join('\n').trim();
  }
}
