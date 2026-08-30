/**
 * Type definitions for payload building in PatientCaptureV2.
 * Supports two output formats: StepGroupedPayload and ParticipantPayload.
 *
 * Participants are now indexed (0, 1, ...) instead of named ("patient" / "partner").
 * Capture mode is 'individual' | 'joint'.
 */

/**
 * Flat object representing a form's captured values.
 * Directly corresponds to FormGroup.value.
 */
export type ParticipantValues = Record<string, unknown>;

/**
 * Options for customizing payload building behavior.
 */
export interface BuildOptions {
  /** If true, omit fields with empty/null values from the output. */
  omitEmpty?: boolean;
  /** Override the timestamp used in Format B payloads. Defaults to new Date().toISOString(). */
  now?: () => string;
}

/**
 * Snapshot of a single step's data.
 * Adapter between PatientCaptureV2's FormGroup arrays and PayloadBuilder.
 * Created by toStepSnapshots() in the component.
 */
export interface StepSnapshot {
  /** Step identifier (e.g., "personal_info", "contact_info"). */
  stepName: string;

  /** Human-readable form title (e.g., "Personal Information"). */
  stepLabel?: string;

  /** True if this step is being captured for multiple participants (joint mode). */
  allowDynamicParticipants: boolean;

  /**
   * Captured values per participant index.
   * Always contains at least key 0 (participant 1).
   * In joint mode also contains key 1 (participant 2), etc.
   * Example: { 0: { p_firstName: "Alice" }, 1: { p_firstName: "Bob" } }
   */
  participants: Record<number, ParticipantValues>;
}

/**
 * Format A: Step-grouped payload (backend contract).
 * Compact structure: step name → array of participant values.
 *
 * Single mode example:
 * {
 *   "personal_info": [{ p_firstName: "Alice", ... }],
 *   "contact_info": [{ p_email: "alice@example.com", ... }]
 * }
 *
 * Joint mode example:
 * {
 *   "personal_info": [
 *     { p_firstName: "Alice", ... },
 *     { p_firstName: "Bob", ... }
 *   ]
 * }
 */
export type StepGroupedPayload = Record<string, ParticipantValues[]>;

/**
 * Participant section within ParticipantPayload.
 * Groups all steps' data for a single participant.
 */
export interface ParticipantSection {
  /** Numeric index of the participant (0 = first person, 1 = second person, etc.). */
  participantIndex: number;

  /** Steps captured for this participant, in stepper order. */
  steps: ParticipantStepEntry[];
}

/**
 * Single step entry within a ParticipantSection.
 */
export interface ParticipantStepEntry {
  /** Step identifier (e.g., "personal_info"). */
  stepName: string;

  /** Human-readable step label (e.g., "Personal Information"). */
  stepLabel?: string;

  /** The participant's form values for this step. */
  values: ParticipantValues;
}

/**
 * Format B: Participant-centric payload (audit & alternative format).
 * Includes metadata and participant-grouped structure.
 *
 * Example (single mode):
 * {
 *   "captureMode": "individual",
 *   "capturedAt": "2026-06-28T13:45:00.000Z",
 *   "participants": [
 *     {
 *       "participantIndex": 0,
 *       "steps": [
 *         { "stepName": "personal_info", "values": { ... } },
 *         { "stepName": "contact_info", "values": { ... } }
 *       ]
 *     }
 *   ]
 * }
 *
 * Example (joint mode):
 * {
 *   "captureMode": "joint",
 *   "capturedAt": "2026-06-28T13:45:00.000Z",
 *   "participants": [
 *     { "participantIndex": 0, "steps": [ ... ] },
 *     { "participantIndex": 1, "steps": [ ... ] }
 *   ]
 * }
 */
export interface ParticipantPayload {
  /** Capture mode: "individual" or "joint". */
  captureMode: 'individual' | 'joint';

  /** ISO 8601 timestamp when the payload was created. */
  capturedAt: string;

  /** Array of participant sections ordered by index. */
  participants: ParticipantSection[];
}

/**
 * Union type representing either payload format.
 */
export type PayloadOutput = StepGroupedPayload | ParticipantPayload;

/**
 * Metadata about a draft save.
 */
export interface DraftMetadata {
  currentStep: number;
  completedSteps: number[];
  totalSteps: number;
}

/**
 * Complete draft data including both payloads and metadata.
 */
export interface DraftData {
  savedAt: string;
  captureMode: 'individual' | 'joint';
  formatA: StepGroupedPayload;
  formatB: ParticipantPayload;
  metadata: DraftMetadata;
  schemaVersion: number;
}

/**
 * Context returned when restoring a draft.
 */
export interface RestoreContext {
  snapshots: StepSnapshot[];
  captureMode: 'individual' | 'joint';
  currentStep: number;
  completedSteps: number[];
}

/**
 * Storage size information.
 */
export interface DraftSizeInfo {
  bytes: number;
  percentOfQuota: number;
  quotaLimit: number;
}
