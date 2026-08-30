import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { patientCaptureReducer, initialPatientCaptureState } from './patient-capture.reducer';
import {
  initializePatientCapture,
  setCurrentStep,
  setActiveParticipant,
  setCaptureMode,
  markStepCompleted,
  updateCapturedStepData,
  restorePatientCaptureState,
} from './patient-capture.actions';

describe('patientCaptureReducer', () => {
  it('initializes step metadata and totals', () => {
    const state = patientCaptureReducer(undefined, initializePatientCapture({ totalSteps: 3 }));

    expect(state.totalSteps).toBe(3);
    expect(state.currentStep).toBe(0);
    expect(state.completedSteps).toEqual([]);
    expect(state.activeParticipant).toBe(0);
    expect(state.captureMode).toBe('individual');
  });

  it('updates the active step and completed steps', () => {
    const state = patientCaptureReducer(
      { ...initialPatientCaptureState, totalSteps: 3 },
      setCurrentStep({ currentStep: 1 })
    );

    const next = patientCaptureReducer(state, markStepCompleted({ stepIndex: 1 }));

    expect(next.currentStep).toBe(1);
    expect(next.completedSteps).toContain(1);
  });

  it('stores step data with indexed participants for captured forms', () => {
    const state = patientCaptureReducer(
      { ...initialPatientCaptureState, totalSteps: 2 },
      setActiveParticipant({ activeParticipant: 1 })
    );

    const next = patientCaptureReducer(
      state,
      updateCapturedStepData({
        stepIndex: 0,
        participantData: {
          participantIndex: 1,
          values: { firstName: 'John' },
        },
        allowDynamicParticipants: true,
      })
    );

    expect(next.activeParticipant).toBe(1);
    expect(next.capturedData[0].participants[1]).toEqual({ firstName: 'John' });
    expect(next.capturedData[0].allowDynamicParticipants).toBe(true);
  });

  it('restores a previous state snapshot with capture mode', () => {
    const next = patientCaptureReducer(
      initialPatientCaptureState,
      restorePatientCaptureState({
        currentStep: 2,
        activeParticipant: 0,
        completedSteps: [0, 1],
        captureMode: 'joint',
        capturedData: {
          0: {
            participants: { 0: { firstName: 'Jane' }, 1: { firstName: 'John' } },
            allowDynamicParticipants: true,
          },
        },
      })
    );

    expect(next.currentStep).toBe(2);
    expect(next.completedSteps).toEqual([0, 1]);
    expect(next.captureMode).toBe('joint');
    expect(next.activeParticipant).toBe(0);
    expect(next.capturedData[0].participants[0]).toEqual({ firstName: 'Jane' });
  });

  it('toggles the capture mode', () => {
    const state = patientCaptureReducer(
      { ...initialPatientCaptureState, totalSteps: 2 },
      setCaptureMode({ captureMode: 'joint' })
    );

    expect(state.captureMode).toBe('joint');
    // Switching mode resets to participant 0
    expect(state.activeParticipant).toBe(0);
  });
});
