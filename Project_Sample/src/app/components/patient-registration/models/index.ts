// ===== Form Field Definition =====
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

// ===== OLD API (DEPRECATED - kept for backward compatibility) =====
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

// ===== NEW API: Two-Tier Backend Loading =====

// Step Reference in Stepper Skeleton (cheap, fast)
export interface StepReference {
  stepId: number;
  formKeyname: string;      // e.g., "reg_personal_info" - used to fetch full definition
  title: string;            // display label
  subtitle?: string;
  order?: number;
}

// Stepper Skeleton Response (GET /api/forms/patient_intake_stepper)
export interface StepperResponse {
  stepperKeyname: string;
  title?: string;
  totalSteps: number;
  steps: StepReference[];   // NO embedded fields
}

// Form Definition Response (GET /api/forms/{formKeyname})
export interface FormDefinitionResponse {
  id: number;
  formKeyname: string;
  formLabel: string;
  formDescription?: string;
  allowDynamicParticipants: boolean;  // enables joint/partner capture
  definition: string;                 // JSON string (must be parsed)
  version: number;
  isActive: boolean;
  createdAt: string;                  // ISO 8601
  updatedAt: string;
}

// Loaded Step: Combination of reference + parsed definition
export interface LoadedStep {
  reference: StepReference;
  meta: FormDefinitionResponse;
  fields: FormFieldControl[];         // parsed from definition string
  allowDynamicParticipants: boolean;
}

// Per-step load status tracking
export type StepLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';
export interface StepState {
  status: StepLoadStatus;
  errorMessage?: string;
  usedFallback?: boolean;
}

// ===== Joint Capture =====
export type ParticipantRole = 'patient' | 'partner';
export interface JointCaptureData {
  enabled: boolean;
  activeRole: ParticipantRole;
  partnerActive: boolean;
  completedByRole: Record<ParticipantRole, Set<string>>;
}

// ===== Payload Output =====
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

// New multi-participant payload structure
export interface Participant {
  role: ParticipantRole;
  forms: Record<string, any>; // formKeyname -> form data
}

export interface MultiParticipantPayload {
  stepperKeyname: string;
  participants: Participant[];
  timestamp: string;
  completed: boolean;
}
