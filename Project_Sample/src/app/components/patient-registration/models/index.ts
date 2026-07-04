export interface FormFieldControl {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'checkgroup';
  placeholder?: string;
  value?: any;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ label: string; value: any }>;
  validators?: any;
  rows?: number;
  min?: number;
  max?: number;
}

export interface StepDefinition {
  stepId: number;
  title: string;
  subtitle: string;
  fields: FormFieldControl[];
}

export interface StepperFormDefinition {
  steps: StepDefinition[];
  totalSteps: number;
}

export interface PayloadStep {
  stepId: number;
  data: { [key: string]: any };
}

export interface Payload {
  step1: { [key: string]: any };
  step2: { [key: string]: any };
  step3: { [key: string]: any };
  timestamp: string;
  completed: boolean;
}
