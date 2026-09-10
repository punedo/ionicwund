import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  filterPlaceholder?: string;
  type?: 'text' | 'date' | 'multiline' | 'badge';
  format?: (row: T) => string | string[];
  cssClass?: string | ((row: T) => string);
}

export interface TableHeaderAction {
  label: string;
  icon?: string;
  cssClass?: string;
  onClick?: () => void;
}

export interface TableRowAction<T = any> {
  label: string;
  icon?: string;
  cssClass?: string;
  onClick?: (row: T) => void;
}

export interface TableTab {
  id: string;
  label: string;
}

export interface TableFilter {
  key: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent<T = any> {
  @Input() title = '';
  @Input() columns: TableColumn<T>[] = [];
  @Input() data: T[] = [];
  @Input() headerActions: TableHeaderAction[] = [];
  @Input() rowActions: TableRowAction<T>[] = [];
  @Input() tabs: TableTab[] = [];
  @Input() activeTab = '';
  @Input() filters: TableFilter[] = [];
  @Input() searchPlaceholder = 'Suche...';
  @Input() emptyMessage = 'Keine Einträge vorhanden.';
  @Input() loading = false;

  @Output() tabChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{ key: string; value: string }>();
  @Output() columnFilterChange = new EventEmitter<{ key: string; value: string }>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<{ key: string; direction: 'asc' | 'desc' }>();

  sortColumn: string | null = null;
  sortAsc = true;
  searchQuery = '';
  columnFilters: { [key: string]: string } = {};

  get displayedData(): T[] {
    let result = this.data ?? [];

    // Global search
    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((row) =>
        this.columns.some((col) => {
          const value = this.getCellValue(col, row);
          const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
          return text.toLowerCase().includes(query);
        })
      );
    }

    // Per-column filters
    for (const col of this.columns) {
      if (!col.filterable) {
        continue;
      }
      const filterValue = (this.columnFilters[col.key] ?? '').trim().toLowerCase();
      if (!filterValue) {
        continue;
      }
      result = result.filter((row) => {
        const value = this.getCellValue(col, row);
        const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
        return text.toLowerCase().includes(filterValue);
      });
    }

    // Sort
    if (this.sortColumn) {
      const col = this.columns.find((c) => c.key === this.sortColumn);
      if (col && col.sortable) {
        const multiplier = this.sortAsc ? 1 : -1;
        result = [...result].sort((a, b) => {
          const av = this.getSortValue(col, a).toLowerCase();
          const bv = this.getSortValue(col, b).toLowerCase();
          if (av < bv) {
            return -1 * multiplier;
          }
          if (av > bv) {
            return 1 * multiplier;
          }
          return 0;
        });
      }
    }

    return result;
  }

  getCellValue(col: TableColumn<T>, row: T): string | string[] {
    if (col.format) {
      return col.format(row);
    }
    const value = (row as Record<string, unknown>)[col.key];
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  isMultiLine(value: string | string[]): value is string[] {
    return Array.isArray(value);
  }

  getSortValue(col: TableColumn<T>, row: T): string {
    const value = this.getCellValue(col, row);
    return Array.isArray(value) ? (value[0] ?? '') : value;
  }

  getCellClass(col: TableColumn<T>, row: T): string {
    if (!col.cssClass) {
      return '';
    }
    return typeof col.cssClass === 'function' ? col.cssClass(row) : col.cssClass;
  }

  onSort(col: TableColumn<T>): void {
    if (!col.sortable) {
      return;
    }

    if (this.sortColumn === col.key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortColumn = col.key;
      this.sortAsc = true;
    }

    this.sortChange.emit({
      key: this.sortColumn!,
      direction: this.sortAsc ? 'asc' : 'desc',
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
    this.searchChange.emit(value);
  }

  onTab(tab: TableTab): void {
    this.activeTab = tab.id;
    this.tabChange.emit(tab.id);
  }

  onFilter(filter: TableFilter, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.filterChange.emit({ key: filter.key, value });
  }

  onColumnFilter(col: TableColumn<T>, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.columnFilters[col.key] = value;
    this.columnFilterChange.emit({ key: col.key, value });
  }

  getColumnFilter(col: TableColumn<T>): string {
    return this.columnFilters[col.key] ?? '';
  }

  handleHeaderAction(action: TableHeaderAction): void {
    if (action.onClick) {
      action.onClick();
    }
  }

  onRowAction(action: TableRowAction<T>, row: T): void {
    if (action.onClick) {
      action.onClick(row);
    }
  }
}
