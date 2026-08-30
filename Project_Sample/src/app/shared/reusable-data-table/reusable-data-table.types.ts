import { Page } from '../../models/page.model';

export type { Page };

/** Column configuration accepted by `<app-reusable-data-table>`. */
export interface ColumnDef<T> {
  /** Property key on the row model. Flat keys only. */
  key: keyof T & string;
  /** Display label for the column header. */
  header: string;
  /** Optional value formatter; receives the row and returns the displayed text. */
  cell?: (row: T) => string;
  /** Allow column sorting. Defaults to `true`. */
  sortable?: boolean;
  /** Optional CSS width (e.g. `'90px'`, `'20%'`). */
  width?: string;
  /** Cell alignment. Defaults to `'start'`. */
  align?: 'start' | 'center' | 'end';
}

/** Payload emitted from `<app-reusable-data-table>` `(pageChange)`. */
export interface PageChange {
  /** Zero-based page index. */
  page: number;
  /** Page size (rows per page). */
  size: number;
}
