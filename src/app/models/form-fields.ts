import { FormGroup } from '@angular/forms';

export type ControlType = 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea' | 'check' | 'radio';

export interface ControlOption {
  label: string;
  value: string;
}

export interface JsonFormControl {
  name: string;
  label: string;
  description: string;
  type: ControlType;
  validators: { required?: boolean; [key: string]: any };
  options?: ControlOption[];
}

export interface JsonFormdata {
  controls: JsonFormControl[];
}

export interface FormStep {
  id: string;
  formTitle: string;
  formDescription: string;
  formUrl: string;
}

export interface MultiStepFormDefinition {
  steps: FormStep[];
}

export interface LoadedStep {
  step: FormStep;
  formData: JsonFormdata;
  formGroup: FormGroup;
}
