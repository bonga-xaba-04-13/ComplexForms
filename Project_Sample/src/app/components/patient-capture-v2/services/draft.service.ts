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
 *
 * Schema versions:
 *   v1 – used `patient`/`partner` fields on StepSnapshot; 'single'/'married' modes
 *   v2 – uses indexed `participants` record; 'individual'/'joint' modes
 *
 * getDraft() accepts both v1 and v2 and migrates v1 in-memory.
 */
@Injectable({ providedIn: 'root' })
export class DraftService {
  private readonly KEY = 'patient_capture_draft';
  private readonly SIMPLE_KEY = 'patient_capture_draft_simple';
  private readonly SCHEMA_VERSION = 2;
  private readonly QUOTA_LIMIT = 5 * 1024 * 1024; // 5MB estimate

  constructor(private payloadBuilder: PayloadBuilder) {}

  saveDraft(
    snapshots: StepSnapshot[],
    captureMode: 'individual' | 'joint',
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
      if (this.isQuotaExceeded(error)) {
        this.clearDraft();
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

  getDraft(): DraftData | null {
    try {
      const json = localStorage.getItem(this.KEY);
      if (!json) return null;

      const draft = JSON.parse(json) as DraftData;

      // Accept both schema versions
      if (draft.schemaVersion === 2) {
        return draft;
      }

      if (draft.schemaVersion === 1) {
        return this.migrateV1Draft(draft);
      }

      console.warn(`Unknown schema version ${draft.schemaVersion}`);
      return null;
    } catch (error) {
      console.error('Failed to parse draft from localStorage:', error);
      return null;
    }
  }

  hasDraft(): boolean {
    return this.getDraft() !== null;
  }

  restoreDraft(): RestoreContext | null {
    const draft = this.getDraft();
    if (!draft) return null;

    const snapshots = this.extractSnapshotsFromDraft(draft);

    return {
      snapshots,
      captureMode: draft.captureMode,
      currentStep: draft.metadata.currentStep,
      completedSteps: draft.metadata.completedSteps
    };
  }

  clearDraft(): void {
    try {
      localStorage.removeItem(this.KEY);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }

  /**
   * Save simplified draft (mirrors backend payload, no metadata).
   */
  saveSimpleDraft(
    snapshots: StepSnapshot[],
    captureMode: 'individual' | 'joint'
  ): void {
    try {
      const payload: Record<string, ParticipantValues[]> = {};

      for (const snap of snapshots) {
        const participantValuesList = Object.keys(snap.participants)
          .map(Number)
          .sort((a, b) => a - b)
          .map(idx => this.omitEmpty(snap.participants[idx] || {}));

        const hasData = participantValuesList.some(v => Object.keys(v).length > 0);
        if (!hasData) continue;

        payload[snap.stepName] = participantValuesList;
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

  restoreSimpleDraft(): {
    captureMode: 'individual' | 'joint';
    snapshots: StepSnapshot[];
  } | null {
    try {
      const raw = localStorage.getItem(this.SIMPLE_KEY);
      if (!raw) return null;

      const draft = JSON.parse(raw) as {
        captureMode: string;
        schemaVersion?: number;
        payload: Record<string, ParticipantValues[]>;
      };

      if (!draft?.payload) return null;

      const snapshots: StepSnapshot[] = Object.entries(draft.payload).map(
        ([stepName, values]) => ({
          stepName,
          allowDynamicParticipants: values.length > 1,
          participants: Object.fromEntries(
            values.map((v, idx) => [idx, v])
          )
        })
      );

      // Normalize capture mode string
      const mode = (draft.captureMode === 'joint') ? 'joint' : 'individual';

      return { captureMode: mode, snapshots };
    } catch (error) {
      console.error('Failed to parse simple draft:', error);
      return null;
    }
  }

  getDraftSize(): DraftSizeInfo | null {
    const draft = this.getDraft();
    if (!draft) return null;

    const json = JSON.stringify(draft);
    const bytes = new Blob([json]).size;

    return {
      bytes,
      quotaLimit: this.QUOTA_LIMIT,
      percentOfQuota: (bytes / this.QUOTA_LIMIT) * 100
    };
  }

  private isQuotaExceeded(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return (
      error.name === 'QuotaExceededError' ||
      error.message.includes('quota') ||
      error.message.includes('storage')
    );
  }

  private omitEmpty(values: ParticipantValues): ParticipantValues {
    return Object.fromEntries(
      Object.entries(values).filter(
        ([, v]) => v !== null && v !== '' && v !== undefined
      )
    );
  }

  /**
   * Migrate a v1 draft (patient/partner → indexed participants).
   * v1 Format A arrays are already positional [patient, partner], so we rebuild
   * snapshots from them directly.
   */
  private migrateV1Draft(v1: DraftData): DraftData {
    const formatA = v1.formatA;
    const formatB = v1.formatB as any; // may reference old role field

    // Rebuild format B for v2
    const participants = [] as any[];
    const maxIdx = Math.max(
      ...Object.values(formatA as Record<string, any[]>)
        .flatMap(arr => arr.length - 1)
    );
    for (let i = 0; i <= maxIdx; i++) {
      const steps = Object.keys(formatA).map(stepName => {
        const val = (formatA as Record<string, any[]>)[stepName]?.[i];
        // Try to find matching step label from old format B
        let stepLabel = '';
        if (formatB.participants) {
          // v1 used 'role' field; map patient→0, partner→1 or index-based
          const p = formatB.participants.find((p: any) => p.participantIndex === i || p.roleIndex === i);
          if (p) {
            const entry = p.steps?.find((s: any) => s.stepName === stepName);
            stepLabel = entry?.stepLabel || '';
          }
        }
        return {
          stepName,
          stepLabel,
          values: val || {}
        };
      });
      participants.push({ participantIndex: i, steps });
    }

    // Legacy mode values ('single'/'married') are compatible with string comparison;
    // newer v2 values are already 'individual'/'joint'. Use as string to avoid TS error.
    const rawMode = (v1.captureMode as string);
    const newCaptureMode = rawMode === 'joint' || rawMode === 'married' ? 'joint' : 'individual';

    const newFormatB: any = {
      captureMode: newCaptureMode,
      capturedAt: formatB.capturedAt || new Date().toISOString(),
      participants
    };

    return {
      ...v1,
      schemaVersion: 2,
      captureMode: newCaptureMode,
      formatA,
      formatB: newFormatB
    };
  }

  /**
   * Extract StepSnapshot[] from stored DraftData.
   * Uses Format A arrays which are already positional by participant index.
   */
  private extractSnapshotsFromDraft(draft: DraftData): StepSnapshot[] {
    const snapshots: StepSnapshot[] = [];

    for (const [stepName, participantValuesList] of Object.entries(draft.formatA)) {
      // Find step label from Format B participant 0
      const p0 = draft.formatB.participants?.find(
        (p: any) => p.participantIndex === 0
      );
      const entry = p0?.steps?.find((s: any) => s.stepName === stepName);

      snapshots.push({
        stepName,
        stepLabel: entry?.stepLabel,
        allowDynamicParticipants: participantValuesList.length > 1,
        participants: Object.fromEntries(
          participantValuesList.map((val, idx) => [idx, val])
        )
      });
    }

    return snapshots;
  }
}
