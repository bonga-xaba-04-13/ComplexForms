import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { ReusableDataTable } from './reusable-data-table';
import { ColumnDef, Page } from './reusable-data-table.types';

interface Row {
  id: number;
  name: string;
}

describe('ReusableDataTable', () => {
  const columns: ColumnDef<Row>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
  ];

  function createComponent(data$: any, extraInputs: Partial<{ searchable: boolean }> = {}) {
    TestBed.configureTestingModule({
      imports: [ReusableDataTable],
    });
    const fixture = TestBed.createComponent(ReusableDataTable<Row>);
    const component = fixture.componentInstance as unknown as ReusableDataTable<Row> & {
      data$: any;
      columns: ColumnDef<Row>[];
      searchable: boolean;
    };
    component.data$ = data$;
    component.columns = columns;
    if (extraInputs.searchable !== undefined) {
      component.searchable = extraInputs.searchable;
    }
    fixture.detectChanges();
    return { fixture, component };
  }

  it('renders a header cell per column', () => {
    const page: Page<Row> = { rows: [{ id: 1, name: 'Alice' }], total: 1, page: 0, size: 10 };
    const { fixture } = createComponent(of(page));
    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('th');
    expect(headers.length).toBeGreaterThanOrEqual(columns.length);
    const labels = Array.from(headers).map((h) => h.textContent?.trim());
    expect(labels).toContain('ID');
    expect(labels).toContain('Name');
  });

  it('emits pageChange when the paginator fires', () => {
    const page: Page<Row> = { rows: [], total: 0, page: 0, size: 10 };
    const { component } = createComponent(of(page));
    const spy = vi.spyOn(component.pageChange, 'emit');
    component.onPage({ pageIndex: 2, pageSize: 25, length: 0, previousPageIndex: 1 } as any);
    expect(spy).toHaveBeenCalledWith({ page: 2, size: 25 });
  });

  it('emits searchChange when the search input changes (debounced)', async () => {
    vi.useFakeTimers();
    const page: Page<Row> = { rows: [], total: 0, page: 0, size: 10 };
    const { component } = createComponent(of(page));
    const spy = vi.spyOn(component.searchChange, 'emit');

    component.searchControl.setValue('hello');
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(350);
    expect(spy).toHaveBeenCalledWith('hello');

    vi.useRealTimers();
  });

  it('hides the search box when searchable is false', () => {
    const page: Page<Row> = { rows: [], total: 0, page: 0, size: 10 };
    const { fixture } = createComponent(of(page), { searchable: false });
    const searchField = (fixture.nativeElement as HTMLElement).querySelector('.rdt-search');
    expect(searchField).toBeNull();
  });

  it('keeps the component reusable across distinct row models', () => {
    // Different `T` — same component class. Just verifies the type accepts it.
    interface OtherRow { code: string; }
    const data$ = new Subject<Page<OtherRow>>();
    TestBed.configureTestingModule({ imports: [ReusableDataTable] });
    const fixture = TestBed.createComponent(ReusableDataTable<OtherRow>);
    const c = fixture.componentInstance as unknown as ReusableDataTable<OtherRow> & { data$: any };
    c.data$ = data$;
    c.columns = [{ key: 'code', header: 'Code' }];
    fixture.detectChanges();
    expect(c).toBeTruthy();
  });
});