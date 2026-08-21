import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import {
  DataTableComponent,
  TableColumn,
  TableFilter,
  TableHeaderAction,
  TableRowAction,
  TableTab,
} from '../../components/data-table/data-table.component';
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, AdminShellComponent, DataTableComponent],
  templateUrl: './patients-list.page.html',
  styleUrls: ['./patients-list.page.scss'],
})
export class PatientsListPage implements OnInit {
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  loading = false;

  activeTab = 'patients';
  searchQuery = '';

  tabs: TableTab[] = [
    { id: 'patients', label: 'Patienten' },
    { id: 'facilities', label: 'Einrichtungen' },
    { id: 'doctors', label: 'Ärzte' },
  ];

  filters: TableFilter[] = [
    {
      key: 'status',
      label: 'Status',
      value: 'all',
      options: [
        { value: 'all', label: 'Status: Alle' },
        { value: 'neu', label: 'neu' },
        { value: 'Beobachtung', label: 'Beobachtung' },
        { value: 'kritisch', label: 'kritisch' },
      ],
    },
    {
      key: 'woundType',
      label: 'Wundtyp',
      value: 'all',
      options: [
        { value: 'all', label: 'Wundtyp: Alle' },
        { value: 'Diabetisches Fußsyndrom', label: 'Diabetisches Fußsyndrom' },
        { value: 'Ulcus cruris varicosum', label: 'Ulcus cruris varicosum' },
        { value: 'Dekubital-Sakral', label: 'Dekubital-Sakral' },
        { value: 'Dekubital-Trochanter', label: 'Dekubital-Trochanter' },
        { value: 'Postoperativ', label: 'Postoperativ' },
      ],
    },
  ];

  columns: TableColumn<Patient>[] = [
    {
      key: 'lastName',
      label: 'Patient',
      sortable: true,
      width: '180px',
      format: (p) => `${p.lastName}, ${p.firstName} (*${this.extractYear(p.dateOfBirth)})`,
    },
    { key: 'woundType', label: 'Wundtyp', sortable: true },
    { key: 'score', label: 'Score / Status', sortable: true },
    {
      key: 'responsible',
      label: 'Zuständig',
      type: 'multiline',
      sortable: true,
      format: (p) => p.responsible ?? [],
    },
    { key: 'lastDocumentedAt', label: 'Letzte Dok.', sortable: true },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      sortable: true,
      cssClass: (p) => `status-${(p.status ?? '').toLowerCase()}`,
    },
  ];

  headerActions: TableHeaderAction[] = [
    { label: 'Exportieren', icon: 'download-outline', cssClass: 'secondary' },
    {
      label: 'Patient anlegen',
      icon: 'add-outline',
      cssClass: 'primary',
      onClick: () => this.router.navigate(['/patients/create']),
    },
  ];

  rowActions: TableRowAction<Patient>[] = [
    {
      label: 'Summed',
      icon: 'list-outline',
      onClick: (patient) => this.onSummary(patient),
    },
    {
      label: 'Versorgung',
      icon: 'bandage-outline',
      onClick: (patient) => this.onCare(patient),
    },
    {
      label: 'Dokumente',
      icon: 'document-text-outline',
      onClick: (patient) => this.onDocuments(patient),
    },
  ];

  constructor(
    private patientService: PatientService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading = true;
    this.patientService.getPatients().subscribe({
      next: (data) => {
        this.patients = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onTabChange(tabId: string): void {
    this.activeTab = tabId;
    this.applyFilters();
  }

  onFilterChange(event: { key: string; value: string }): void {
    const filter = this.filters.find((f) => f.key === event.key);
    if (filter) {
      filter.value = event.value;
    }
    this.applyFilters();
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  applyFilters(): void {
    if (this.activeTab !== 'patients') {
      this.filteredPatients = [];
      return;
    }

    const statusFilter = this.filters.find((f) => f.key === 'status')?.value ?? 'all';
    const woundTypeFilter = this.filters.find((f) => f.key === 'woundType')?.value ?? 'all';
    const query = this.searchQuery.trim().toLowerCase();

    this.filteredPatients = this.patients.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesWoundType = woundTypeFilter === 'all' || p.woundType === woundTypeFilter;

      const matchesSearch =
        !query ||
        `${p.lastName}, ${p.firstName}`.toLowerCase().includes(query) ||
        (p.woundType?.toLowerCase() ?? '').includes(query) ||
        (p.status?.toLowerCase() ?? '').includes(query) ||
        (p.responsible?.some((r) => r.toLowerCase().includes(query)) ?? false);

      return matchesStatus && matchesWoundType && matchesSearch;
    });
  }

  onSummary(patient: Patient): void {
    // TODO: navigate to summary/detail view
    console.log('Summary for', patient);
  }

  onCare(patient: Patient): void {
    // TODO: navigate to care planning
    console.log('Care for', patient);
  }

  onDocuments(patient: Patient): void {
    // TODO: navigate to documents
    console.log('Documents for', patient);
  }

  private extractYear(date?: string): string {
    if (!date) {
      return '—';
    }
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return date;
    }
    return String(parsed.getFullYear());
  }
}
