import { FormGroup } from '@angular/forms';
import { CaptureMode, Participant } from '../models/capture-mode.model';

export interface LoadedStepPayloadInput {
  formKeyName: string;
  isDynamic: boolean;
  participantForms: FormGroup[];
}

export interface SubmitPayload {
  [stepKey: string]: any[];
}

export function buildSubmitPayload(
  loadedSteps: LoadedStepPayloadInput[],
  captureMode: CaptureMode,
  participants: Participant[]
): SubmitPayload {
  const payload: SubmitPayload = {};

  loadedSteps.forEach((step, stepIndex) => {
    const stepKey = `step${stepIndex + 1}`;
    const instanceCount = step.isDynamic && captureMode === 'joint' ? participants.length : 1;

    const stepValues: any[] = [];
    for (let i = 0; i < instanceCount; i++) {
      if (step.participantForms[i]) {
        stepValues.push(step.participantForms[i].getRawValue());
      }
    }

    payload[stepKey] = stepValues;
  });

  return payload;
}
