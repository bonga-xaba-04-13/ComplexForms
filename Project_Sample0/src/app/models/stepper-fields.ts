import { FormGroup } from '@angular/forms';
import { JsonFormdata } from './form-fields';

export interface StepConfig {
  id: string;
  label: string;
  description: string;
  formUrl: string;
  optional: string;
}

export interface StepperConfig {
  formTitle: string | 'Patient capture details.';
  formDescription: string | 'Default strig.';
  linear: boolean | true;
  steps: StepConfig[];
}

export interface LoadedStep {
  config: StepConfig;
  formJson: JsonFormdata;
  formGroup: FormGroup;
  rows: any[][];
}
