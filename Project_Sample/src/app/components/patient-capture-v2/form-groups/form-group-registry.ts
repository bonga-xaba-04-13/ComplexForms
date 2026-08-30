import { JsonFormControl } from '../../../models/form-fields';

export type FormGroupType = 'unknown' | 'personal' | 'medical' | 'contact' | 'demographics' | string;

export interface FormGroupTypeMapping {
  type: FormGroupType;
  confidence: number;
  indicators: string[];
}

/**
 * Registry that identifies form group types based on control names and structure.
 * This helps map forms to their specific components.
 */
export class FormGroupRegistry {
  private static readonly FORM_TYPE_PATTERNS: Record<FormGroupType, string[]> = {
    personal: [
      'firstName', 'lastName', 'fullName', 'dateOfBirth', 'gender', 'maritalStatus',
      'nationalId', 'idNumber', 'passport'
    ],
    medical: [
      'medicalCondition', 'allergies', 'medications', 'bloodType', 'healthHistory',
      'previousSurgeries', 'chronicDiseases', 'hasAllergies'
    ],
    contact: [
      'email', 'phone', 'phoneNumber', 'address', 'city', 'state', 'country',
      'zipCode', 'postalCode', 'streetAddress'
    ],
    demographics: [
      'occupation', 'education', 'religion', 'ethnicity', 'language',
      'incomeLevel', 'employment', 'maritalStatus'
    ],
    unknown: []
  };

  /**
   * Normalize field name by removing common prefixes (p_, partner_, etc).
   */
  private static normalizeFieldName(fieldName: string): string {
    return fieldName.toLowerCase()
      .replace(/^p_/, '')
      .replace(/^partner_/, '')
      .replace(/^patient_/, '');
  }

  /**
   * Identify the form group type based on its controls.
   * Returns the most likely type with confidence score.
   */
  static identifyFormType(controls: JsonFormControl[]): FormGroupTypeMapping {
    if (!controls || controls.length === 0) {
      return { type: 'unknown', confidence: 0, indicators: [] };
    }

    const controlNames = controls.map(c => this.normalizeFieldName(c.name));
    const scores: Record<FormGroupType, number> = {
      personal: 0,
      medical: 0,
      contact: 0,
      demographics: 0,
      unknown: 0
    };

    const matchedIndicators: Record<FormGroupType, string[]> = {
      personal: [],
      medical: [],
      contact: [],
      demographics: [],
      unknown: []
    };

    // Score each control name against form type patterns
    for (const [type, patterns] of Object.entries(this.FORM_TYPE_PATTERNS)) {
      for (const controlName of controlNames) {
        for (const pattern of patterns) {
          if (controlName.includes(pattern.toLowerCase())) {
            scores[type as FormGroupType]++;
            if (!matchedIndicators[type as FormGroupType].includes(controlName)) {
              matchedIndicators[type as FormGroupType].push(controlName);
            }
          }
        }
      }
    }

    // Find type with highest score
    let maxScore = 0;
    let detectedType: FormGroupType = 'unknown';

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type as FormGroupType;
      }
    }

    const totalControls = controlNames.length;
    const confidence = totalControls > 0 ? (maxScore / totalControls) * 100 : 0;

    return {
      type: detectedType,
      confidence: Math.round(confidence),
      indicators: matchedIndicators[detectedType]
    };
  }

  /**
   * Add custom form type pattern (for extending the registry).
   * Useful for identifying form types beyond the defaults.
   */
  static addCustomFormType(
    typeName: FormGroupType,
    patterns: string[]
  ): void {
    this.FORM_TYPE_PATTERNS[typeName] = [
      ...(this.FORM_TYPE_PATTERNS[typeName] || []),
      ...patterns
    ];
  }

  /**
   * Log form type detection for debugging purposes.
   * Call this in PatientCaptureV2 to identify all form types your API returns.
   */
  static logFormTypeDetection(formDefinition: any, controls: JsonFormControl[]): void {
    const detection = this.identifyFormType(controls);
    console.log(`[FormGroupRegistry] Form: "${formDefinition?.keyname || 'unknown'}"`, {
      detectedType: detection.type,
      confidence: `${detection.confidence}%`,
      matchedFields: detection.indicators,
      totalControls: controls.length
    });
  }
}
