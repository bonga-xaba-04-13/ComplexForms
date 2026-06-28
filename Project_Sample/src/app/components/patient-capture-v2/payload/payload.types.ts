/**
 * Type definitions for payload building in PatientCaptureV2.
 * Supports two output formats: StepGroupedPayload and ParticipantPayload.
 */

/**
 * Flat object representing a form's captured values.
 * Directly corresponds to FormGroup.value.
 * Example: { p_firstName: "Alice", p_lastName: "Smith", ... }
 */
export type ParticipantValues = Record<string, unknown>;

/**
 * Options for customizing payload building behavior.
 */
export interface BuildOptions {
  /**
   * If true, omit fields with empty/null values from the output.
   */
  omitEmpty?: boolean;

  /**
   * Override the timestamp used in Format B payloads.
   * Defaults to new Date().toISOString().
   * Useful for deterministic testing.
   */
  now?: () => string;
}

/**
 * Snapshot of a single step's data.
 * Adapter between PatientCaptureV2's FormGroup arrays and PayloadBuilder.
 * Created by toStepSnapshots() in the component.
 */
export interface StepSnapshot {
  /**
   * Step identifier (e.g., "personal_info", "contact_info").
   * Comes from form definition's keyname or derived.
   */
  stepName: string;

  /**
   * Human-readable form title (e.g., "Personal Information").
   * Optional; used in Format B for display and audit.
   */
  stepLabel?: string;

  /**
   * True if this step allows capturing both patient and partner data.
   * Determines whether the output array has 1 or 2 elements.
   */
  allowDynamicParticipants: boolean;

  /**
   * Patient's form values for this step.
   * Always present (non-null).
   * Example: { p_firstName: "Alice", p_lastName: "Smith" }
   */
  patient: ParticipantValues;

  /**
   * Partner's form values for this step.
   * Present and filled if allowDynamicParticipants=true.
   * Present but empty if allowDynamicParticipants=false.
   * Example: { p_firstName: "Bob", p_lastName: "Smith" }
   */
  partner: ParticipantValues;
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
 * Married mode example:
 * {
 *   "personal_info": [
 *     { p_firstName: "Alice", ... },
 *     { p_firstName: "Bob", ... }
 *   ],
 *   "contact_info": [
 *     { p_email: "alice@example.com", ... },
 *     { p_email: "bob@example.com", ... }
 *   ]
 * }
 *
 * Rules:
 * - Key = step name (from StepSnapshot.stepName)
 * - Value = array of participant values
 * - Single step: array length = 1 (just patient)
 * - Married step: array length = 2 (patient, then partner)
 * - Empty fields can be omitted with omitEmpty: true
 */
export type StepGroupedPayload = Record<string, ParticipantValues[]>;

/**
 * Participant section within ParticipantPayload.
 * Groups all steps' data for a single participant.
 */
export interface ParticipantSection {
  /**
   * Role identifier: "patient" or "partner".
   */
  role: 'patient' | 'partner';

  /**
   * Steps captured for this participant, in stepper order.
   */
  steps: ParticipantStepEntry[];
}

/**
 * Single step entry within a ParticipantSection.
 * Represents one step's data for a participant.
 */
export interface ParticipantStepEntry {
  /**
   * Step identifier (e.g., "personal_info").
   */
  stepName: string;

  /**
   * Human-readable step label (e.g., "Personal Information").
   * Optional; omitted if not provided.
   */
  stepLabel?: string;

  /**
   * The participant's form values for this step.
   */
  values: ParticipantValues;
}

/**
 * Format B: Participant-centric payload (audit & alternative format).
 * Includes metadata and participant-grouped structure.
 *
 * Example (single mode):
 * {
 *   "captureMode": "single",
 *   "capturedAt": "2026-06-28T13:45:00.000Z",
 *   "participants": [
 *     {
 *       "role": "patient",
 *       "steps": [
 *         { "stepName": "personal_info", "values": { ... } },
 *         { "stepName": "contact_info", "values": { ... } }
 *       ]
 *     }
 *   ]
 * }
 *
 * Example (married mode):
 * {
 *   "captureMode": "married",
 *   "capturedAt": "2026-06-28T13:45:00.000Z",
 *   "participants": [
 *     {
 *       "role": "patient",
 *       "steps": [ ... ]
 *     },
 *     {
 *       "role": "partner",
 *       "steps": [ ... ]
 *     }
 *   ]
 * }
 *
 * Suitable for:
 * - Audit logs
 * - Client-side rehydration
 * - Detailed tracking of what was captured
 * - User review screens
 */
export interface ParticipantPayload {
  /**
   * Capture mode: "single" if only patient data, "married" if partner data exists.
   * Determined by checking if any partner step has non-empty values.
   */
  captureMode: 'single' | 'married';

  /**
   * ISO 8601 timestamp when the payload was created.
   * Defaults to current time; can be overridden via BuildOptions.now().
   */
  capturedAt: string;

  /**
   * Array of participant sections (patient always present, partner only if married).
   * Order: [patient, partner] if married; [patient] if single.
   */
  participants: ParticipantSection[];
}

/**
 * Union type representing either payload format.
 * Use as return type when a method can produce either format.
 */
export type PayloadOutput = StepGroupedPayload | ParticipantPayload;
