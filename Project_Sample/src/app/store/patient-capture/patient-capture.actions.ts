import { createAction, props } from '@ngrx/store';

/**
 * Currently active participant index (0-based).
 * 0 = first person always; in joint mode user can switch to 1 = second person.
 */
export type ActiveParticipant = number;

/**
 * Capture mode: capturing for one person vs multiple people.
 */
export type CaptureMode = 'individual' | 'joint';

/**
 * Captured data per step, keyed by numeric participant index.
 */
export interface StepCaptureData {
  /** Values keyed by participant index: { 0: {...}, 1: {...} } */
  participants: Record<number, Record<string, unknown>>;
  /** True when this step is available to multiple participants (joint mode). */
  allowDynamicParticipants: boolean;
  stepName?: string;
  stepLabel?: string;
  isComplete?: boolean;
}

export interface RestorePatientCapturePayload {
  currentStep: number;
  activeParticipant: number;
  completedSteps: number[];
  captureMode: CaptureMode;
  capturedData: Record<number, StepCaptureData>;
}

export const initializePatientCapture = createAction(
  '[Patient Capture] Initialize',
  props<{
    totalSteps: number;
    currentStep?: number;
    activeParticipant?: number;
    captureMode?: CaptureMode;
    completedSteps?: number[];
    capturedData?: Record<number, StepCaptureData>;
  }>()
);

export const setCurrentStep = createAction(
  '[Patient Capture] Set Current Step',
  props<{ currentStep: number }>()
);

/** Switch which participant's form data is currently visible. */
export const setActiveParticipant = createAction(
  '[Patient Capture] Set Active Participant',
  props<{ activeParticipant: number }>()
);

/** Toggle between individual and joint capture mode. */
export const setCaptureMode = createAction(
  '[Patient Capture] Set Capture Mode',
  props<{ captureMode: CaptureMode }>()
);

export const markStepCompleted = createAction(
  '[Patient Capture] Mark Step Completed',
  props<{ stepIndex: number }>()
);

export const updateCapturedStepData = createAction(
  '[Patient Capture] Update Captured Step Data',
  props<{
    stepIndex: number;
    participants?: Record<number, Record<string, unknown>>;
    participantData?: { participantIndex: number; values: Record<string, unknown> };
    allowDynamicParticipants?: boolean;
    stepName?: string;
    stepLabel?: string;
    isComplete?: boolean;
  }>()
);

export const restorePatientCaptureState = createAction(
  '[Patient Capture] Restore State',
  props<RestorePatientCapturePayload>()
);
