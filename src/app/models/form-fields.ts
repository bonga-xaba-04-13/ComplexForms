import { FormGroup } from '@angular/forms';

export type ControlType = 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea' | 'check' | 'radio';

export interface ControlOption {
  label: string;
  value: string;
  [key: string]: any;
}

export interface OptionsSource {
  /** Demo: resolves to /assets/api/<endpoint>.json. Real backend: maps to an API route. */
  endpoint: string;
  /** Property on each returned object to use as the option value. Defaults to 'value'. */
  valueKey?: string;
  /** Property on each returned object to use as the option label. Defaults to 'label'. */
  labelKey?: string;
  /** Map of targetControlName -> sourceObjectKey, applied to other controls when an option is selected. */
  populates?: Record<string, string>;
}

export interface JsonFormControl {
  name: string;
  label: string;
  description: string;
  type: ControlType;
  validators: { required?: boolean; [key: string]: any };
  options?: ControlOption[];
  /** For 'select' controls: fetch options dynamically instead of using a static `options` list. */
  optionsSource?: OptionsSource;
  /** When true the field spans both grid columns (auto-applied to textarea and check types). */
  span2?: boolean;
}

export interface JsonFormdata {
  allowDynamicParticipants?: boolean;
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
