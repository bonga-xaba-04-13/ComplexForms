/**
 * Generic shape for a paginated API response.
 *
 * The backend's `GET /api/forms/patient/intakes` (and any future list endpoint
 * consumed by `<app-reusable-data-table>`) is expected to return this shape.
 */
export interface Page<T> {
  /** Rows for the current page. */
  rows: T[];
  /** Total number of rows across all pages. */
  total: number;
  /** Zero-based page index echoed back from the server. */
  page: number;
  /** Page size echoed back from the server. */
  size: number;
}

/**
 * Flat shape of a patient intake record as displayed in the intakes table.
 *
 * The exact backend contract is not yet defined; fields are optional except
 * for the primary identifier (`id`) and the display name (`fullName`). Extra
 * backend fields are permitted via the index signature.
 */
export interface PatientIntake {
  id: number | string;
  fullName: string;
  dob?: string;
  gender?: string;
  intakeDate?: string;
  status?: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | string;
  [key: string]: unknown;
}
