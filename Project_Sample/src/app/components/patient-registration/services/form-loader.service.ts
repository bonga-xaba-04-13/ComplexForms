import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, tap, timeout, retry, shareReplay, map } from 'rxjs/operators';
import {
  StepperResponse,
  FormDefinitionResponse,
  LoadedStep,
} from '../models/index';
import { parseAndValidateDefinition } from '../utils/definition-parser';
import { MOCK_STEPPER, MOCK_STEP_FORMS } from '../mocks/form-mocks';

const API_BASE = 'http://localhost:8080/api/forms';
const API_TIMEOUT = 10_000;
const RETRY_COUNT = 2;
const RETRY_DELAY = 300;

@Injectable({
  providedIn: 'root'
})
export class FormLoaderService {
  private stepCache = new Map<string, Observable<LoadedStep>>();
  private stepper$?: Observable<StepperResponse>;

  constructor(private http: HttpClient) {}

  /**
   * Load stepper skeleton once per session.
   * Caches result for reuse.
   */
  loadStepper(): Observable<StepperResponse> {
    if (this.stepper$) {
      return this.stepper$;
    }

    this.stepper$ = this.http
      .get<StepperResponse>(`${API_BASE}/patient_intake_stepper`)
      .pipe(
        timeout(API_TIMEOUT),
        retry({
          count: RETRY_COUNT,
          delay: () => timer(RETRY_DELAY),
        }),
        tap((data) => {
          console.log('[FormLoaderService] Loaded stepper from API', data);
        }),
        catchError((error) => {
          console.warn('[FormLoaderService] Failed to load stepper, using mock', error);
          return of(MOCK_STEPPER);
        }),
        shareReplay(1)
      );

    return this.stepper$;
  }

  /**
   * Lazy-load a step's form definition by formKeyname.
   * Idempotent: multiple calls return cached Observable.
   */
  loadFormForStep(formKeyname: string): Observable<LoadedStep> {
    if (this.stepCache.has(formKeyname)) {
      return this.stepCache.get(formKeyname)!;
    }

    const request$ = this.http
      .get<FormDefinitionResponse>(`${API_BASE}/${formKeyname}`)
      .pipe(
        timeout(API_TIMEOUT),
        retry({
          count: RETRY_COUNT,
          delay: () => timer(RETRY_DELAY),
        }),
        map((res) => this.toLoadedStep(res)),
        tap((loaded) => {
          console.log('[FormLoaderService] Loaded form:', formKeyname, loaded);
        }),
        catchError((err) => this.fallbackOrFail(formKeyname, err)),
        shareReplay(1)
      );

    this.stepCache.set(formKeyname, request$);
    return request$;
  }

  /**
   * Convert FormDefinitionResponse to LoadedStep.
   */
  private toLoadedStep(res: FormDefinitionResponse): LoadedStep {
    const fields = parseAndValidateDefinition(res.definition, res.formKeyname);
    return {
      reference: {
        stepId: -1,
        formKeyname: res.formKeyname,
        title: res.formLabel,
        subtitle: res.formDescription,
      },
      meta: res,
      fields,
      allowDynamicParticipants: !!res.allowDynamicParticipants,
    };
  }

  /**
   * On error: try mock fallback if available.
   */
  private fallbackOrFail(
    formKeyname: string,
    err: unknown
  ): Observable<LoadedStep> {
    const mock = MOCK_STEP_FORMS[formKeyname as keyof typeof MOCK_STEP_FORMS];
    if (mock) {
      console.warn(
        `[FormLoaderService] Failed to load ${formKeyname}, using mock`,
        err
      );
      return of(this.toLoadedStep(mock));
    }

    this.stepCache.delete(formKeyname);
    console.error(`[FormLoaderService] Failed to load ${formKeyname}, no mock available`, err);
    return throwError(() => ({
      formKeyname,
      message: 'FORM_NOT_FOUND',
      originalError: err,
    }));
  }

  /**
   * Clear all caches (e.g., on logout).
   */
  clearCache(): void {
    this.stepCache.clear();
    this.stepper$ = undefined;
    console.log('[FormLoaderService] Caches cleared');
  }
}
