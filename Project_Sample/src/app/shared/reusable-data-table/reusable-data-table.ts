import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Observable, debounceTime, distinctUntilChanged } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { ColumnDef, Page, PageChange } from './reusable-data-table.types';

/**
 * Generic, standalone data-table built on Angular Material.
 *
 * Designed to be reusable across any list page that needs:
 *  - pagination
 *  - an optional debounced server-side search box
 *  - sortable columns
 *  - a loading spinner overlay
 *
 * Consumers wire data by passing `data$` (a stream of `Page<T>`) and a list
 * of `ColumnDef<T>` for column headers. The component owns pagination and
 * search UI state; it emits events so the parent can refetch.
 */
@Component({
  selector: 'app-reusable-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './reusable-data-table.html',
  styleUrl: './reusable-data-table.scss',
})
export class ReusableDataTable<T> implements OnInit {
  /** Stream of paginated rows. Emits `null` (initialValue) until the first page arrives. */
  @Input({ required: true }) data$!: Observable<Page<T>>;

  /** Column definitions. Order matters — drives both header and row layout. */
  @Input({ required: true }) columns: ColumnDef<T>[] = [];

  /** Initial page size. Can be overridden by the parent after a fetch. */
  @Input() pageSize = 10;

  /** Options shown in the page-size selector. */
  @Input() pageSizeOptions: number[] = [5, 10, 25, 50];

  /** Toggle the search box. Default `true`. */
  @Input() searchable = true;

  /** Placeholder for the search input. */
  @Input() searchPlaceholder = 'Search…';

  /**
   * Optional external loading stream. When provided it overrides the implicit
   * "loading while `data$` has not emitted" state.
   */
  @Input() loading$?: Observable<boolean>;

  // ── Outputs ──────────────────────────────────────────────────────────────
  @Output() rowClick = new EventEmitter<T>();
  @Output() pageChange = new EventEmitter<PageChange>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<Sort>();

  // ── Internal state ───────────────────────────────────────────────────────
  /** FormControl bound to the search input. */
  readonly searchControl = new FormControl<string>('', { nonNullable: true });

  /** Latest page snapshot from `data$`. `undefined` until the first emission. */
  private pageSignal!: ReturnType<typeof toSignal<Page<T> | undefined>>;

  /** Rows for the current page; `[]` while loading. */
  readonly rows = computed<T[]>(() => this.pageSignal?.()?.rows ?? []);

  /** Total row count across all pages; `0` while loading. */
  readonly total = computed<number>(() => this.pageSignal?.()?.total ?? 0);

  /** Column keys used by `MatTable`'s `displayedColumns`. */
  readonly displayedColumns = computed<string[]>(() =>
    this.columns.map((c) => c.key),
  );

  /** Spinner state: prefer the optional `loading$`, fall back to "no data yet". */
  readonly loading = computed<boolean>(() => {
    if (this.loadingSignal != null) {
      return this.loadingSignal();
    }
    return this.pageSignal?.() === undefined;
  });

  /** Backing signal for the optional `loading$` input. */
  private loadingSignal: ReturnType<typeof toSignal<boolean>> | null = null;

  ngOnInit(): void {
    // `data$` is `@Input({ required: true })` — guaranteed to be set by ngOnInit.
    this.pageSignal = toSignal<Page<T> | undefined>(this.data$, {
      initialValue: undefined,
    });

    if (this.loading$) {
      this.loadingSignal = toSignal(this.loading$, { initialValue: false });
    }

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => this.searchChange.emit(term));
  }

  // ── Event handlers exposed to the template ───────────────────────────────
  onPage(event: PageEvent): void {
    this.pageChange.emit({ page: event.pageIndex, size: event.pageSize });
  }

  onSort(sort: Sort): void {
    this.sortChange.emit(sort);
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  /**
   * Resolve the displayed cell value for `row` against `column`.
   * Uses the optional `cell` formatter when provided, otherwise the raw value.
   */
  cellValue(row: T, column: ColumnDef<T>): string {
    if (column.cell) {
      return column.cell(row);
    }
    const value = (row as Record<string, unknown>)[column.key];
    return value == null ? '' : String(value);
  }
}
