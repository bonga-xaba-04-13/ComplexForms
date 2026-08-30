import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import {
  ParticipantPayload,
  ParticipantValues,
  StepGroupedPayload,
  StepSnapshot,
} from '../payload/payload.types';

/**
 * Data shapes this service accepts as patch input. All three already exist in
 * the codebase (payload.types.ts) — no new interface is introduced:
 *
 *  1. StepSnapshot[]        — the canonical draft-restore shape.
 *  2. StepGroupedPayload    — Format A ("backend contract"):
 *                             { stepName: [participant0_values, participant1_values, ...] }
 *  3. ParticipantPayload    — Format B ("audit"):
 *                             { participants: [{ participantIndex, steps: [{ stepName, values }] }] }
 */
export type PatchableData = StepSnapshot[] | StepGroupedPayload | ParticipantPayload;

/**
 * Patches all built FormGroups (every step × every participant) with data that
 * was loaded from an API (e.g. an existing patient record).
 *
 * Why this scales:
 *  - No form group is ever referenced by name — the loop is driven purely by
 *    "which steps were built" and "which participants the data mentions".
 *    Adding step 5 (or participant 3) requires no change to this class.
 *  - `patchValue` is key-tolerant: data fields that don't exist in a FormGroup
 *    are ignored, so a mismatched step or participant is a silent no-op rather
 *    than a crash.
 *
 * Step resolution order (see {@link resolveStepIndex}):
 *  1. Match the data's stepName/formLabel against the loaded step definitions.
 *  2. Fall back to the data's position in the array (snapshots are usually the
 *     same order as the built forms — e.g. output of `toStepSnapshots()`).
 */
@Injectable({ providedIn: 'root' })
export class FormPatchService {

  /**
   * Patch every form group with the supplied data.
   *
   * @param participantForms          Form groups per participant index
   *                                  (`participantForms[0][2]` = participant 1,
   *                                  step 3). Built by PatientCaptureV2.
   * @param data                      Any of the three accepted shapes.
   * @param stepMeta                  The loaded step definitions in build order
   *                                  (PatientCaptureV2.LoadedSteps — each entry
   *                                  carries `keyname` and `formLabel`). Used to
   *                                  resolve which FormGroup a data step maps to.
   *                                  When empty, positional order is assumed.
   * @param buildFormsForParticipant  Optional factory that lazily builds the
   *                                  FormGroup[] for a participant whose forms
   *                                  aren't present yet (used in joint mode when
   *                                  the API data contains a second participant).
   */
  patch(
    participantForms: Record<number, FormGroup[]>,
    data: PatchableData,
    stepMeta: any[] = [],
    buildFormsForParticipant?: (participantIndex: number) => FormGroup[]
  ): void {
    const snapshots = this.toSnapshots(data);

    snapshots.forEach((snapshot, snapshotIndex) => {
      const stepIndex = this.resolveStepIndex(snapshot, snapshotIndex, stepMeta);

      Object.entries(snapshot.participants).forEach(([participantKey, values]) => {
        const participantIndex = Number(participantKey);
        this.ensureParticipantForms(participantForms, participantIndex, buildFormsForParticipant);

        // Safe no-op when the step/participant has no built FormGroup yet.
        participantForms[participantIndex]?.[stepIndex]?.patchValue(values);
      });
    });
  }

  // ── Normalization: any accepted shape → StepSnapshot[] ───────────────────

  private toSnapshots(data: PatchableData): StepSnapshot[] {
    if (Array.isArray(data)) {
      // Shape 1 — already StepSnapshot[] (the draft-restore path).
      return data;
    }
    if (this.isParticipantPayload(data)) {
      // Shape 3 — Format B: participant-grouped.
      return this.fromParticipantPayload(data);
    }
    // Shape 2 — Format A: step-grouped.
    return this.fromStepGroupedPayload(data);
  }

  /**
   * Type guard: Format B payloads have a literal `participants: ParticipantSection[]`
   * field. StepGroupedPayload is a Record<string, ParticipantValues[]> and so is
   * not assignable to this shape.
   */
  private isParticipantPayload(data: StepGroupedPayload | ParticipantPayload): data is ParticipantPayload {
    return 'participants' in data && Array.isArray((data as ParticipantPayload).participants);
  }

  /** Format A: `{ stepName: [p0values, p1values, ...] }` → StepSnapshot[]. */
  private fromStepGroupedPayload(payload: StepGroupedPayload): StepSnapshot[] {
    return Object.entries(payload).map(([stepName, valuesList]) => ({
      stepName,
      allowDynamicParticipants: valuesList.length > 1,
      participants: Object.fromEntries(
        valuesList.map((values, index) => [index, values])
      ),
    }));
  }

  /** Format B: participant-grouped → StepSnapshot[] (regrouped by step). */
  private fromParticipantPayload(payload: ParticipantPayload): StepSnapshot[] {
    const byStep = new Map<string, {
      stepLabel?: string;
      valuesByParticipant: Record<number, ParticipantValues>;
    }>();

    for (const section of payload.participants) {
      for (const entry of section.steps) {
        let bucket = byStep.get(entry.stepName);
        if (!bucket) {
          bucket = { stepLabel: entry.stepLabel, valuesByParticipant: {} };
          byStep.set(entry.stepName, bucket);
        }
        bucket.valuesByParticipant[section.participantIndex] = entry.values;
      }
    }

    return Array.from(byStep.entries()).map(([stepName, bucket]) => ({
      stepName,
      stepLabel: bucket.stepLabel,
      allowDynamicParticipants: payload.participants.length > 1,
      participants: bucket.valuesByParticipant,
    }));
  }

  // ── Step/participant resolution ──────────────────────────────────────────

  /**
   * Map a data step to the index of the FormGroup that should receive its values.
   * Prefers a keyname/formLabel match against the loaded step definitions, then
   * falls back to the data's array position.
   */
  private resolveStepIndex(
    snapshot: StepSnapshot,
    snapshotIndex: number,
    stepMeta: any[]
  ): number {
    const matched = stepMeta.findIndex(
      (step) => step.keyname === snapshot.stepName || step.formLabel === snapshot.stepLabel
    );
    return matched !== -1 ? matched : snapshotIndex;
  }

  /** Build a participant's forms on demand if the data references them first. */
  private ensureParticipantForms(
    participantForms: Record<number, FormGroup[]>,
    participantIndex: number,
    buildFormsForParticipant?: (participantIndex: number) => FormGroup[]
  ): void {
    if (!participantForms[participantIndex] && buildFormsForParticipant) {
      participantForms[participantIndex] = buildFormsForParticipant(participantIndex);
    }
  }
}