import { Injectable } from '@angular/core';
import {
  BuildOptions,
  ParticipantPayload,
  ParticipantSection,
  ParticipantStepEntry,
  ParticipantValues,
  StepGroupedPayload,
  StepSnapshot
} from './payload.types';

/**
 * Service for building structured payloads from captured form data.
 *
 * Participants are now indexed (0-based) instead of named roles.
 */
@Injectable({ providedIn: 'root' })
export class PayloadBuilder {

  /**
   * Build Format A: Step-grouped payload (backend contract).
   *
   * Structure: { stepName → [participant0_values, participant1_values, ...] }
   */
  buildStepGroupedPayload(
    steps: StepSnapshot[],
    options: BuildOptions = {}
  ): StepGroupedPayload {
    const result: StepGroupedPayload = {};

    for (const step of steps) {
      result[step.stepName] = this.buildParticipantsForStep(step, options);
    }

    return result;
  }

  /**
   * Build Format B: Participant-centric payload (audit format).
   *
   * Structure:
   * {
   *   captureMode: "individual" | "joint",
   *   capturedAt: "ISO-timestamp",
   *   participants: [
   *     { participantIndex: 0, steps: [...] },
   *     { participantIndex: 1, steps: [...] }  // only if joint
   *   ]
   * }
   */
  buildParticipantPayload(
    steps: StepSnapshot[],
    options: BuildOptions = {}
  ): ParticipantPayload {
    // Determine capture mode: any participant beyond index 0 has data?
    const hasMultipleParticipants = steps.some(step => {
      const p1Data = step.participants[1];
      return !!p1Data && Object.keys(this.filterEmpty(p1Data, options.omitEmpty)).length > 0;
    });

    const participants: ParticipantSection[] = [];

    // Build section for each participant that has data
    const maxIndex = steps.reduce((max, step) => {
      return Math.max(max, ...Object.keys(step.participants).map(Number));
    }, 0);

    for (let idx = 0; idx <= maxIndex; idx++) {
      const participantSteps = steps.map(step => {
        const values = step.participants[idx] || {};
        return {
          stepName: step.stepName,
          ...(step.stepLabel && { stepLabel: step.stepLabel }),
          values: this.filterEmpty(values, options.omitEmpty)
        } as ParticipantStepEntry;
      });

      participants.push({
        participantIndex: idx,
        steps: participantSteps
      });
    }

    return {
      captureMode: hasMultipleParticipants ? 'joint' : 'individual',
      capturedAt: options.now ? options.now() : new Date().toISOString(),
      participants
    };
  }

  /**
   * Build array of participant values for a single step.
   * Returns participant values in index order.
   */
  private buildParticipantsForStep(
    step: StepSnapshot,
    options: BuildOptions
  ): ParticipantValues[] {
    const sortedIndices = Object.keys(step.participants)
      .map(Number)
      .sort((a, b) => a - b);

    return sortedIndices.map(idx =>
      this.filterEmpty(step.participants[idx], options.omitEmpty)
    );
  }

  /**
   * Filter out empty/null values if omitEmpty is true.
   */
  private filterEmpty(
    values: ParticipantValues,
    omitEmpty: boolean | undefined
  ): ParticipantValues {
    if (!omitEmpty) {
      return { ...values }; // Return copy
    }

    return Object.fromEntries(
      Object.entries(values).filter(([_, value]) => {
        if (value === null || value === undefined || value === '') {
          return false;
        }
        if (Array.isArray(value) && value.length === 0) {
          return false;
        }
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
          return false;
        }
        return true;
      })
    );
  }
}
