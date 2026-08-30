import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Service for submitting patient intake data to the backend via HTTP POST.
 * During development/demo the endpoint may not exist — the payload is always logged
 * to console so it can be inspected in the browser Network tab regardless.
 */
@Injectable({ providedIn: 'root' })
export class SubmissionService {

  // ── Config ──────────────────────────────────────────────────────────────
  private readonly demoPostUrl = '/api/forms/patient-intake-demo';

  constructor(private http: HttpClient) {}

  /**
   * Send the full capture payload to the backend.
   *
   * The request body is always logged so that it appears in DevTools → Network → Preview
   * even when the server is unreachable (which it will be during local dev).
   *
   * @param payload  Object containing `backend` (Format A) and `audit` (Format B).
   * @returns        Observable of the raw response (any type).
   */
  submitIntake(payload: { backend: Record<string, unknown>; audit: unknown }): Observable<unknown> {
    console.log('========== DEMO POST payload ==========');
    console.log('[Format A – Step Grouped]', payload.backend);
    console.log('[Format B – Participant Centric]', payload.audit);
    console.log('=======================================');

    return this.http.post(this.demoPostUrl, payload);
  }
}
