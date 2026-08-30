import { createSelector } from '@ngrx/store';
import { AppState, PatientCaptureState } from './patient-capture.reducer';

export const selectPatientCaptureState = (state: AppState): PatientCaptureState => state.patientCapture;
export const selectCurrentStep = createSelector(
  selectPatientCaptureState,
  (state) => state.currentStep
);

/** Currently visible participant index (0-based). */
export const selectActiveParticipant = createSelector(
  selectPatientCaptureState,
  (state) => state.activeParticipant
);

/** Individual or joint capture mode. */
export const selectCaptureMode = createSelector(
  selectPatientCaptureState,
  (state) => state.captureMode
);

export const selectCapturedData = createSelector(
  selectPatientCaptureState,
  (state) => state.capturedData
);

export const selectCompletedSteps = createSelector(
  selectPatientCaptureState,
  (state) => state.completedSteps
);
