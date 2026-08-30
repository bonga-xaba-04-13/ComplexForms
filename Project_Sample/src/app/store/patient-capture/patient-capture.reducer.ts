import { createReducer, on } from '@ngrx/store';
import {
  initializePatientCapture,
  markStepCompleted,
  restorePatientCaptureState,
  setActiveParticipant,
  setCaptureMode,
  setCurrentStep,
  updateCapturedStepData,
} from './patient-capture.actions';
import { CaptureMode } from './patient-capture.actions';

export interface PatientCaptureState {
  totalSteps: number;
  currentStep: number;
  /** Currently visible participant index (0-based). */
  activeParticipant: number;
  /** Individual or joint capture mode. */
  captureMode: CaptureMode;
  completedSteps: number[];
  capturedData: Record<number, import('./patient-capture.actions').StepCaptureData>;
}

export interface AppState {
  patientCapture: PatientCaptureState;
}

export const initialPatientCaptureState: PatientCaptureState = {
  totalSteps: 0,
  currentStep: 0,
  activeParticipant: 0,
  captureMode: 'individual',
  completedSteps: [],
  capturedData: {},
};

export const patientCaptureReducer = createReducer(
  initialPatientCaptureState,
  on(initializePatientCapture, (state, action) => ({
    ...state,
    totalSteps: action.totalSteps,
    currentStep: action.currentStep ?? state.currentStep,
    activeParticipant: action.activeParticipant ?? state.activeParticipant,
    captureMode: action.captureMode ?? state.captureMode,
    completedSteps: action.completedSteps ?? state.completedSteps,
    capturedData: action.capturedData ?? state.capturedData,
  })),
  on(setCurrentStep, (state, { currentStep }) => ({
    ...state,
    currentStep: state.totalSteps > 0 ? Math.min(Math.max(currentStep, 0), state.totalSteps - 1) : 0,
  })),
  on(setActiveParticipant, (state, { activeParticipant }) => ({
    ...state,
    activeParticipant,
  })),
  on(setCaptureMode, (state, { captureMode }) => ({
    ...state,
    captureMode,
    // Reset to participant 0 when switching modes
    activeParticipant: 0,
  })),
  on(markStepCompleted, (state, { stepIndex }) => ({
    ...state,
    completedSteps: Array.from(new Set([...state.completedSteps, stepIndex])),
  })),
  on(updateCapturedStepData, (state, { stepIndex, participants, participantData, allowDynamicParticipants, stepName, stepLabel, isComplete }) => {
    const existing = state.capturedData[stepIndex] ?? {
      participants: { 0: {} },
      allowDynamicParticipants: false,
    };

    // Build updated participants record
    let updatedParticipants = { ...(existing.participants ?? {}) };

    if (participantData) {
      // Single-participant update (called on field change)
      updatedParticipants[participantData.participantIndex] = participantData.values;
    } else if (participants) {
      // Bulk update (used during saveDraft / applyRestoredData)
      updatedParticipants = participants;
    }

    return {
      ...state,
      capturedData: {
        ...state.capturedData,
        [stepIndex]: {
          ...existing,
          participants: updatedParticipants,
          allowDynamicParticipants: allowDynamicParticipants ?? existing.allowDynamicParticipants ?? false,
          stepName: stepName ?? existing.stepName,
          stepLabel: stepLabel ?? existing.stepLabel,
          isComplete: isComplete ?? existing.isComplete ?? false,
        },
      },
    };
  }),
  on(restorePatientCaptureState, (state, action) => ({
    ...state,
    currentStep: action.currentStep,
    activeParticipant: action.activeParticipant,
    captureMode: action.captureMode,
    completedSteps: action.completedSteps,
    capturedData: action.capturedData,
  }))
);
