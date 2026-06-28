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
 * Provides two output formats:
 * 1. StepGroupedPayload (Format A) — compact, backend-friendly
 * 2. ParticipantPayload (Format B) — audit-friendly, participant-centric
 *
 * Why a service:
 * - Consistent with project's DI pattern
 * - Mockable in tests
 * - Stateless (pure methods) → singleton is safe
 *
 * Dependencies:
 * - None. The builder receives fully extracted data.
 * - Does not call FormService, HTTP, or other APIs.
 * - Trivially testable without TestBed.
 */
@Injectable({ providedIn: 'root' })
export class PayloadBuilder {

  /**
   * Build Format A: Step-grouped payload (backend contract).
   *
   * Structure: { stepName → [patient, (partner)], ... }
   * - Single step: array length = 1
   * - Married step: array length = 2 [patient, partner]
   *
   * @param steps Array of step snapshots (one per form)
   * @param options.omitEmpty If true, drop empty/null fields
   * @returns Record mapping step name to array of participant values
   */
  buildStepGroupedPayload(
    steps: StepSnapshot[],
    options: BuildOptions = {}
  ): StepGroupedPayload {
    const result: StepGroupedPayload = {};

    for (const step of steps) {
      const participants = this.buildParticipantsForStep(step, options);
      result[step.stepName] = participants;
    }

    return result;
  }

  /**
   * Build Format B: Participant-centric payload (audit format).
   *
   * Structure:
   * {
   *   captureMode: "single" | "married",
   *   capturedAt: "ISO-timestamp",
   *   participants: [
   *     { role: "patient", steps: [...] },
   *     { role: "partner", steps: [...] }  // only if married
   *   ]
   * }
   *
   * @param steps Array of step snapshots
   * @param options.omitEmpty If true, drop empty/null fields
   * @param options.now Override timestamp (for deterministic testing)
   * @returns ParticipantPayload with metadata and participant sections
   */
  buildParticipantPayload(
    steps: StepSnapshot[],
    options: BuildOptions = {}
  ): ParticipantPayload {
    // Determine capture mode by checking if any step has partner data
    const isMaRRied = steps.some(step => this.hasPartnerData(step, options));

    // Build patient section
    const patientSteps = steps.map(step => ({
      stepName: step.stepName,
      ...(step.stepLabel && { stepLabel: step.stepLabel }),
      values: this.filterEmpty(step.patient, options.omitEmpty)
    } as ParticipantStepEntry));

    const participants: ParticipantSection[] = [
      {
        role: 'patient',
        steps: patientSteps
      }
    ];

    // Build partner section if married
    if (isMaRRied) {
      const partnerSteps = steps
        .filter(step => step.allowDynamicParticipants)
        .map(step => ({
          stepName: step.stepName,
          ...(step.stepLabel && { stepLabel: step.stepLabel }),
          values: this.filterEmpty(step.partner, options.omitEmpty)
        } as ParticipantStepEntry));

      participants.push({
        role: 'partner',
        steps: partnerSteps
      });
    }

    return {
      captureMode: isMaRRied ? 'married' : 'single',
      capturedAt: options.now ? options.now() : new Date().toISOString(),
      participants
    };
  }

  /**
   * Build array of participant values for a single step.
   * Returns [patient] for single steps, [patient, partner] for married steps.
   */
  private buildParticipantsForStep(
    step: StepSnapshot,
    options: BuildOptions
  ): ParticipantValues[] {
    const participants: ParticipantValues[] = [
      this.filterEmpty(step.patient, options.omitEmpty)
    ];

    // Include partner if this step allows dynamic participants and partner has data
    if (step.allowDynamicParticipants && this.hasPartnerData(step, options)) {
      participants.push(this.filterEmpty(step.partner, options.omitEmpty));
    }

    return participants;
  }

  /**
   * Check if a step's partner data is non-empty.
   * Used to determine capture mode and whether to include partner in arrays.
   */
  private hasPartnerData(step: StepSnapshot, options: BuildOptions): boolean {
    if (!step.allowDynamicParticipants) {
      return false;
    }

    const partner = this.filterEmpty(step.partner, options.omitEmpty);
    return Object.keys(partner).length > 0;
  }

  /**
   * Filter out empty/null values if omitEmpty is true.
   * Otherwise return the object as-is.
   */
  private filterEmpty(
    values: ParticipantValues,
    omitEmpty: boolean | undefined
  ): ParticipantValues {
    if (!omitEmpty) {
      return { ...values }; // Return copy
    }

    // Filter out null, undefined, empty string, empty array, empty object
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
