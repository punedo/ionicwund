import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import {
  DataTableComponent,
  TableColumn,
  TableHeaderAction,
  TableRowAction,
} from '../../components/data-table/data-table.component';
import { PatientService } from '../../services/patient.service';
import { OrderService } from '../../services/order.service';
import { LoadingService } from '../../services/loading.service';
import { Patient } from '../../models/patient.model';
import { Order } from '../../models/order.model';
import { CarePlanRow } from '../../models/woundcare.model';

@Component({
  selector: 'app-woundcare',
  standalone: true,
  imports: [CommonModule, AdminShellComponent, DataTableComponent],
  templateUrl: './woundcare.page.html',
  styleUrls: ['./woundcare.page.scss'],
})
export class WoundcarePage implements OnInit {
  rows: CarePlanRow[] = [];
  filteredRows: CarePlanRow[] = [];
  loading = false;

  columns: TableColumn<CarePlanRow>[] = [
    {
      key: 'patientName',
      label: 'Patient',
      sortable: true,
      width: '180px',
    },
    { key: 'category', label: 'Kategorie', sortable: true },
    {
      key: 'orderNumber',
      label: 'Auftragsnr.',
      sortable: true,
      width: '120px',
    },
    {
      key: 'period',
      label: 'Versorgungszeitraum',
      sortable: true,
      width: '180px',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      sortable: true,
      cssClass: (row) => `status-${(row.status ?? '').toLowerCase()}`,
    },
    {
      key: 'changeRequest',
      label: 'Änderungsanfrage',
      type: 'badge',
      sortable: false,
      cssClass: () => 'amber',
    },
  ];

  headerActions: TableHeaderAction[] = [];

  rowActions: TableRowAction<CarePlanRow>[] = [
    { label: 'Ansehen', icon: 'eye-outline', onClick: (row) => this.openPatient(row) },
  ];

  constructor(
    private patientService: PatientService,
    private orderService: OrderService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.loadingService.show();

    const [patients, orders] = await Promise.all([
      new Promise<Patient[]>((resolve) =>
        this.patientService.getPatients().subscribe((data) => resolve(data))
      ),
      new Promise<Order[]>((resolve) =>
        this.orderService.getOrders().subscribe((data) => resolve(data))
      ),
    ]);

    const patientByName = new Map<string, Patient>();
    patients.forEach((p) => patientByName.set(`${p.lastName}, ${p.firstName}`, p));

    this.rows = orders
      .filter((o) => o.patient)
      .map((o) => {
        const patient = patientByName.get(o.patient ?? '');
        const start = o.orderDate ?? '';
        const end = o.desiredDeliveryDate ?? '';
        const category = o.items?.length
          ? o.items[0].name
          : o.type ?? 'Wundversorgung';

        return {
          patientId: patient?.id ?? 0,
          patientName: o.patient ?? 'Unbekannt',
          category,
          orderNumber: o.orderNumber ?? '',
          period: start && end ? `${this.formatDate(start)} – ${this.formatDate(end)}` : '',
          status: o.status ?? 'offen',
          changeRequest: '—',
          patient,
        };
      });

    this.filteredRows = [...this.rows];
    this.loading = false;
    this.loadingService.hide();
  }

  openPatient(row: CarePlanRow): void {
    if (row.patientId) {
      this.router.navigate(['/patients', row.patientId], {
        state: { patient: row.patient },
      });
    }
  }

  onFilterChange(event: { key: string; value: string }): void {
    // Basic placeholder for future filters
    this.filteredRows = [...this.rows];
  }

  onSearch(query: string): void {
    const q = query.toLowerCase();
    this.filteredRows = this.rows.filter(
      (row) =>
        row.patientName.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.orderNumber.toLowerCase().includes(q)
    );
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString('de-DE');
  }
}
