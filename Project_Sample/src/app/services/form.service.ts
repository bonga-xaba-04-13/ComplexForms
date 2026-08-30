import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, shareReplay, catchError } from 'rxjs/operators';
import { Page, PatientIntake } from '../models/page.model';

interface ComboboxOption {
  label: string;
  value: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class FormService {
  private apiUrl = 'http://localhost:8080/api/forms';
  private optionsUrl = 'http://localhost:8080/api/lookups';

  // Cache for select/combobox options to avoid redundant DB calls
  private optionsCache = new Map<string, Observable<ComboboxOption[]>>();

  constructor(private http: HttpClient) {}

  getStepperForm(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/patient_intake_stepper`);
  }

  /**
   * Fetch a page of patient intake records.
   *
   * Calls `GET /api/forms/patient/intakes?page=<n>&size=<n>[&q=<query>]`
   * and returns the parsed `Page<PatientIntake>`.
   *
   * Errors are intentionally NOT swallowed here so that the consuming page
   * (e.g. `IntakesPage`) can decide how to react.
   */
  getPatientIntakes(
    page = 0,
    size = 10,
    search?: string,
  ): Observable<Page<PatientIntake>> {
    const params: Record<string, string | number> = { page, size };
    if (search && search.trim().length > 0) {
      params['q'] = search.trim();
    }
    return this.http.get<Page<PatientIntake>>(
      `${this.apiUrl}/patient/intakes`,
      { params: params as any },
    );
  }

  getSubForm(keyname: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${keyname}`);
  }

  loadAllSubForms(definition: any[]): Observable<any[]> {
    if (!definition || definition.length === 0) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    const requests = definition.map(item => this.getSubForm(item.form_keyname));
    return forkJoin(requests);
  }

  loadStepperWithSubForms(): Observable<{ stepper: any; forms: any[] }> {
    return this.getStepperForm().pipe(
      switchMap(stepperForm => {
        return this.loadAllSubForms(stepperForm.definition).pipe(
          map(forms => ({
            stepper: stepperForm,
            forms: forms
          }))
        );
      })
    );
  }

  /**
   * Search combobox options from DB by field name and search query.
   * Example: searchComboboxOptions('medicalCondition', 'diab')
   * Returns all matching conditions that contain 'diab'.
   */
  searchComboboxOptions(fieldName: string, searchQuery: string): Observable<ComboboxOption[]> {
    const params = { field: fieldName, q: searchQuery };
    return this.http.get<ComboboxOption[]>(
      `${this.optionsUrl}/combobox`,
      { params: params as any }
    ).pipe(
      catchError(() => of([])) // Return empty array on error
    );
  }
  searchOptions(fieldName: string, searchQuery: string): Observable<ComboboxOption[]> {
    const params = { value: searchQuery };
    return this.http.get<ComboboxOption[]>(
      `${this.optionsUrl}/${fieldName}`,
      { params: params as any }
    ).pipe(
      catchError(() => of([])) // Return empty array on error
    );
  }

  /**
   * Get all select options for a field from DB.
   * Example: getSelectOptions('country') returns all countries.
   * Results are cached to avoid redundant calls.
   */
  getSelectOptions(fieldName: string): Observable<ComboboxOption[]> {
    // Return cached result if available
    if (this.optionsCache.has(fieldName)) {
      return this.optionsCache.get(fieldName)!;
    }

    // Fetch from DB and cache result
    const request$ = this.http.get<ComboboxOption[]>(
      `${this.optionsUrl}/select`,
      { params: { field: fieldName } as any }
    ).pipe(
      shareReplay(1), // Share result among subscribers and cache
      catchError(() => of([])) // Return empty array on error
    );

    this.optionsCache.set(fieldName, request$);
    return request$;
  }

  /**
   * Get options by categoryId (used in form definitions).
   * Example: getOptionsByCategory('nationality') returns all nationalities.
   * Results are cached to avoid redundant calls.
   */
  getOptionsByCategory(categoryId: string): Observable<ComboboxOption[]> {
    const cacheKey = `category_${categoryId}`;

    // Return cached result if available
    if (this.optionsCache.has(cacheKey)) {
      return this.optionsCache.get(cacheKey)!;
    }

    // Fetch from DB and cache result
    const request$ = this.http.get<ComboboxOption[]>(
      `${this.optionsUrl}/${categoryId}`
    ).pipe(
      shareReplay(1), // Share result among subscribers and cache
      catchError(() => of([])) // Return empty array on error
    );

    this.optionsCache.set(cacheKey, request$);
    return request$;
  }

  /**
   * Get dependent options based on parent selection.
   * Example: getDependentOptions('cities', 'Kenya') returns cities in Kenya.
   */
  getDependentOptions(fieldName: string, parentValue: string): Observable<ComboboxOption[]> {
    const params = { field: fieldName, parent: parentValue };
    return this.http.get<ComboboxOption[]>(
      `${this.optionsUrl}/dependent`,
      { params: params as any }
    ).pipe(
      catchError(() => of([])) // Return empty array on error
    );
  }

  /**
   * Clear options cache (useful on logout or data refresh).
   */
  clearOptionsCache(): void {
    this.optionsCache.clear();
  }
}
