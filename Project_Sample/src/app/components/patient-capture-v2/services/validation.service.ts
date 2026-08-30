import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

export interface ValidationError {
  stepIndex: number;
  stepLabel: string;
  fieldName: string;
  errorType: string;
  message: string;
  /** Participant index (0-based). */
  participantIndex: number;
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

  private getErrorMessage(fieldName: string, errorType: string): string {
    const formattedFieldName = this.formatFieldName(fieldName);
    return `${formattedFieldName} is required`;
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .trim();
  }

  private validateFormGroup(
    formGroup: FormGroup,
    stepIndex: number,
    stepLabel: string,
    participantIndex: number = 0
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    // Validate only if the form has any controls (skips empty stub groups)
    if (!formGroup || formGroup.status === 'INVALID') {
      Object.keys(formGroup?.controls ?? {}).forEach(fieldName => {
        const control = formGroup.get(fieldName);
        if (control && control.invalid && control.errors) {
          Object.keys(control.errors).forEach(errorType => {
            errors.push({
              stepIndex,
              stepLabel,
              fieldName,
              errorType,
              message: this.getErrorMessage(fieldName, errorType),
              participantIndex
            });
          });
        }
      });
    }
    return errors;
  }

  /**
   * Validate all forms for a specific participant (all steps up to `validateUpToStep`).
   */
  validateParticipantForms(
    participantForms: FormGroup[],
    formLabels: string[],
    participantIndex: number = 0,
    validateUpToStep?: number
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const upTo = validateUpToStep ?? participantForms.length - 1;

    for (let i = 0; i <= upTo && i < participantForms.length; i++) {
      const fv = participantForms[i].value;
      // For joint-mode participants beyond index 0, skip empty stubs
      if (participantIndex > 0 && !Object.values(fv).some(v => v)) {
        continue;
      }
      const stepErrors = this.validateFormGroup(
        participantForms[i],
        i,
        formLabels[i] || `Step ${i + 1}`,
        participantIndex
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
   * Validate current step only.
   */
  validateCurrentStep(
    formGroup: FormGroup,
    stepIndex: number,
    stepLabel: string,
    participantIndex: number = 0
  ): ValidationResult {
    const errors = this.validateFormGroup(formGroup, stepIndex, stepLabel, participantIndex);
    return {
      isValid: errors.length === 0,
      errors,
      firstInvalidStepIndex: errors.length > 0 ? stepIndex : undefined,
      summary: this.generateSummary(errors)
    };
  }

  /**
   * Convenience: validate ALL patient (participant 0) forms — legacy entry point used by old code paths.
   * Kept temporarily during the transition but internally delegates to the indexed version.
   */
  validateAllPatientForms(
    patientForms: FormGroup[],
    formLabels: string[],
    validateUpToStep?: number
  ): ValidationResult {
    return this.validateParticipantForms(patientForms, formLabels, 0, validateUpToStep);
  }

  /**
   * Legacy convenience: validate ALL partner forms. Delegates to indexed version.
   */
  validateAllPartnerForms(
    partnerForms: FormGroup[],
    formLabels: string[],
    validateUpToStep?: number
  ): ValidationError[] {
    return this.validateParticipantForms(partnerForms, formLabels, 1, validateUpToStep).errors;
  }

  private generateSummary(errors: ValidationError[]): string {
    if (errors.length === 0) return 'All fields are valid';
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

  private groupErrorsByStep(errors: ValidationError[]): Record<string, ValidationError[]> {
    return errors.reduce((acc, error) => {
      const key = error.stepLabel;
      if (!acc[key]) acc[key] = [];
      acc[key].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);
  }

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
