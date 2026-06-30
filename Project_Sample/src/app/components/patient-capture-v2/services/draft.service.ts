import { Injectable } from '@angular/core';
import { PayloadBuilder } from '../payload/payload-builder.service';
import {
  DraftData,
  DraftMetadata,
  DraftSizeInfo,
  RestoreContext,
  StepSnapshot,
  ParticipantValues
} from '../payload/payload.types';

/**
 * Service for managing draft saves to localStorage.
 * Stores both Format A (backend) and Format B (audit) payloads together.
 *
 * Features:
 * - Save/restore form progress with both payload formats
 * - Error handling (quota exceeded, corrupted data)
 * - Schema versioning for future migrations
 * - Simple KISS implementation (no compression, single draft per user)
 */
@Injectable({ providedIn: 'root' })
export class DraftService {
  private readonly KEY = 'patient_capture_draft';
  private readonly SIMPLE_KEY = 'patient_capture_draft_simple';
  private readonly SCHEMA_VERSION = 1;
  private readonly QUOTA_LIMIT = 5 * 1024 * 1024; // 5MB estimate

  constructor(private payloadBuilder: PayloadBuilder) {}

  /**
   * Save current form progress as a draft (both formats).
   * Overwrites previous draft if it exists.
   *
   * @param snapshots Form step snapshots from PatientCaptureV2
   * @param captureMode 'single' or 'married'
   * @param metadata Current step progress metadata
   * @throws Error if save fails (e.g., quota exceeded)
   */
  saveDraft(
    snapshots: StepSnapshot[],
    captureMode: 'single' | 'married',
    metadata: DraftMetadata
  ): void {
    try {
      const formatA = this.payloadBuilder.buildStepGroupedPayload(snapshots);
      const formatB = this.payloadBuilder.buildParticipantPayload(snapshots);

      const draftData: DraftData = {
        savedAt: new Date().toISOString(),
        captureMode,
        formatA,
        formatB,
        metadata,
        schemaVersion: this.SCHEMA_VERSION
      };

      const json = JSON.stringify(draftData);
      localStorage.setItem(this.KEY, json);
    } catch (error) {
      // Handle quota exceeded
      if (this.isQuotaExceeded(error)) {
        this.clearDraft();
        // Retry once after clearing
        try {
          const formatA = this.payloadBuilder.buildStepGroupedPayload(snapshots);
          const formatB = this.payloadBuilder.buildParticipantPayload(snapshots);
          const draftData: DraftData = {
            savedAt: new Date().toISOString(),
            captureMode,
            formatA,
            formatB,
            metadata,
            schemaVersion: this.SCHEMA_VERSION
          };
          localStorage.setItem(this.KEY, JSON.stringify(draftData));
        } catch (retryError) {
          throw new Error('Draft save failed: localStorage quota exceeded');
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Retrieve saved draft from localStorage if it exists.
   * Validates schema version before returning.
   *
   * @returns DraftData if valid draft exists, null otherwise
   */
  getDraft(): DraftData | null {
    try {
      const json = localStorage.getItem(this.KEY);
      if (!json) {
        return null;
      }

      const draft = JSON.parse(json) as DraftData;

      // Validate schema version
      if (draft.schemaVersion !== this.SCHEMA_VERSION) {
        console.warn(
          `Draft schema version mismatch: expected ${this.SCHEMA_VERSION}, got ${draft.schemaVersion}`
        );
        // For now, return null; in future could migrate here
        return null;
      }

      return draft;
    } catch (error) {
      console.error('Failed to parse draft from localStorage:', error);
      return null;
    }
  }

  /**
   * Check if a valid draft exists in localStorage.
   */
  hasDraft(): boolean {
    return this.getDraft() !== null;
  }

  /**
   * Restore draft data as snapshots and metadata for form population.
   * Returns null if no valid draft exists.
   *
   * @returns RestoreContext with snapshots and metadata, or null
   */
  restoreDraft(): RestoreContext | null {
    const draft = this.getDraft();
    if (!draft) {
      return null;
    }

    // Extract snapshots from stored payload (Format B is easiest to convert back)
    const snapshots = this.extractSnapshotsFromDraft(draft);

    return {
      snapshots,
      captureMode: draft.captureMode,
      currentStep: draft.metadata.currentStep,
      completedSteps: draft.metadata.completedSteps
    };
  }

  /**
   * Clear the saved draft from localStorage.
   */
  clearDraft(): void {
    try {
      localStorage.removeItem(this.KEY);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }

  /**
   * Save simplified draft (format mirrors backend payload, no metadata).
   * Stores only non-empty form values in a single compact structure.
   *
   * @param snapshots Form step snapshots from PatientCaptureV2
   * @param captureMode 'single' or 'married'
   * @throws Error if save fails
   */
  saveSimpleDraft(
    snapshots: StepSnapshot[],
    captureMode: 'single' | 'married'
  ): void {
    try {
      const payload: Record<string, ParticipantValues[]> = {};

      for (const snap of snapshots) {
        const patientValues = this.omitEmpty(snap.patient);
        const partnerValues = snap.allowDynamicParticipants
          ? this.omitEmpty(snap.partner)
          : null;

        // Skip steps where both patient and partner are empty
        const hasData =
          Object.keys(patientValues).length > 0 ||
          (partnerValues && Object.keys(partnerValues).length > 0);
        if (!hasData) continue;

        const arr: ParticipantValues[] = [patientValues];
        if (partnerValues && Object.keys(partnerValues).length > 0) {
          arr.push(partnerValues);
        }
        payload[snap.stepName] = arr;
      }

      const draft = {
        captureMode,
        schemaVersion: this.SCHEMA_VERSION,
        payload
      };

      localStorage.setItem(this.SIMPLE_KEY, JSON.stringify(draft));
    } catch (error) {
      throw new Error(`Failed to save simple draft: ${error}`);
    }
  }

  /**
   * Restore simplified draft from localStorage.
   * Returns null if no valid draft exists.
   *
   * @returns Object with captureMode and snapshots, or null
   */
  restoreSimpleDraft(): {
    captureMode: 'single' | 'married';
    snapshots: StepSnapshot[];
  } | null {
    try {
      const raw = localStorage.getItem(this.SIMPLE_KEY);
      if (!raw) {
        return null;
      }

      const draft = JSON.parse(raw) as {
        captureMode: 'single' | 'married';
        schemaVersion?: number;
        payload: Record<string, ParticipantValues[]>;
      };

      if (!draft?.payload) {
        return null;
      }

      const snapshots: StepSnapshot[] = Object.entries(draft.payload).map(
        ([stepName, values]) => ({
          stepName,
          allowDynamicParticipants: values.length > 1,
          patient: values[0] ?? {},
          partner: values[1] ?? {}
        })
      );

      return {
        captureMode: draft.captureMode,
        snapshots
      };
    } catch (error) {
      console.error('Failed to parse simple draft:', error);
      return null;
    }
  }

  /**
   * Get current draft size in bytes and as percentage of quota.
   *
   * @returns Size information or null if no draft exists
   */
  getDraftSize(): DraftSizeInfo | null {
    const draft = this.getDraft();
    if (!draft) {
      return null;
    }

    const json = JSON.stringify(draft);
    const bytes = new Blob([json]).size;

    return {
      bytes,
      quotaLimit: this.QUOTA_LIMIT,
      percentOfQuota: (bytes / this.QUOTA_LIMIT) * 100
    };
  }

  /**
   * Check if error is a quota exceeded error.
   */
  private isQuotaExceeded(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.name === 'QuotaExceededError' ||
      error.message.includes('quota') ||
      error.message.includes('storage')
    );
  }

  /**
   * Remove null, empty string, and undefined values from an object.
   */
  private omitEmpty(values: ParticipantValues): ParticipantValues {
    return Object.fromEntries(
      Object.entries(values).filter(
        ([, v]) => v !== null && v !== '' && v !== undefined
      )
    );
  }

  /**
   * Extract StepSnapshot[] from stored DraftData.
   * Converts Format B (participant-centric) back to snapshots.
   */
  private extractSnapshotsFromDraft(draft: DraftData): StepSnapshot[] {
    const snapshots: StepSnapshot[] = [];

    // Get step names from Format A
    for (const [stepName, participantValues] of Object.entries(draft.formatA)) {
      // Find matching step info from Format B
      const patientStep = draft.formatB.participants[0]?.steps.find(
        s => s.stepName === stepName
      );
      const partnerStep = draft.formatB.participants[1]?.steps.find(
        s => s.stepName === stepName
      );

      snapshots.push({
        stepName,
        stepLabel: patientStep?.stepLabel,
        allowDynamicParticipants: participantValues.length > 1,
        patient: patientStep?.values || {},
        partner: partnerStep?.values || {}
      });
    }

    return snapshots;
  }
}
