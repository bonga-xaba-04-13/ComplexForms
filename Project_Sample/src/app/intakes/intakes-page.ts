import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
} from 'rxjs/operators';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { FormService } from '../services/form.service';
import { MockAuthService } from '../auth/mock-auth.service';
import { Page, PatientIntake } from '../models/page.model';
import {
  ColumnDef,
  PageChange,
} from '../shared/reusable-data-table/reusable-data-table.types';
import { ReusableDataTable } from '../shared/reusable-data-table/reusable-data-table';

/**
 * Patient Intakes list page.
 *
 * Wires `FormService.getPatientIntakes(...)` into `<app-reusable-data-table>`.
 * Owns pagination + search + error + loading state.
 */
@Component({
  selector: 'app-intakes-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    ReusableDataTable,
  ],
  templateUrl: './intakes-page.html',
  styleUrl: './intakes-page.scss',
})
export class IntakesPage {
  private readonly formService = inject(FormService);
  private readonly auth = inject(MockAuthService);
  private readonly router = inject(Router);

  // ── State ───────────────────────────────────────────────────────────────
  private readonly searchSubject = new BehaviorSubject<string>('');
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);

  /** Debounced search stream — emitted from the table via `searchChange`. */
  private readonly debouncedSearch$ = this.searchSubject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
  );

  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);

  /** Loading flag as an Observable so the table can consume it via input. */
  readonly loading$: Observable<boolean> = toObservable(this.loading);

  /**
   * Combine the latest refresh trigger with the latest search term so that
   * changing either re-fetches the current page.
   */
  readonly data$: Observable<Page<PatientIntake>> = combineLatest([
    this.refreshSubject,
    this.debouncedSearch$,
  ]).pipe(
    switchMap(([_, search]) => {
      this.loading.set(true);
      return this.formService
        .getPatientIntakes(this.pageIndex(), this.pageSize(), search || undefined)
        .pipe(
          tap(() => {
            this.loading.set(false);
            this.error.set(null);
          }),
          catchError((err) => {
            this.loading.set(false);
            this.error.set(err?.message ?? 'Failed to load patient intakes');
            // Return an empty page so the table can render its empty state
            // instead of failing the stream.
            return of({
              rows: [],
              total: 0,
              page: this.pageIndex(),
              size: this.pageSize(),
            } as Page<PatientIntake>);
          }),
        );
    }),
  );

  // ── Column definitions ──────────────────────────────────────────────────
  readonly columns: ColumnDef<PatientIntake>[] = [
    { key: 'id', header: 'ID', sortable: true, width: '90px' },
    { key: 'fullName', header: 'Full Name', sortable: true },
    { key: 'dob', header: 'DOB', cell: (r) => r.dob ?? '' },
    { key: 'gender', header: 'Gender' },
    {
      key: 'intakeDate',
      header: 'Intake Date',
      cell: (r) => r.intakeDate ?? '',
    },
    { key: 'status', header: 'Status' },
  ];

  // ── Event handlers ──────────────────────────────────────────────────────
  onPageChange(event: PageChange): void {
    this.pageIndex.set(event.page);
    this.pageSize.set(event.size);
    this.refreshSubject.next();
  }

  onSearchChange(term: string): void {
    // Reset to the first page whenever the search query changes.
    this.pageIndex.set(0);
    this.searchSubject.next(term);
  }

  onRowClick(_row: PatientIntake): void {
    // Placeholder for a future detail view.
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}