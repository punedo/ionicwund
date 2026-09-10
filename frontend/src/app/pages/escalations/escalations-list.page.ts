import { ApplicationRef, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import {
  DataTableComponent,
  TableColumn,
  TableRowAction,
} from '../../components/data-table/data-table.component';
import { Escalation, EscalationService } from '../../services/escalation.service';

@Component({
  selector: 'app-escalations-list',
  standalone: true,
  imports: [CommonModule, AdminShellComponent, DataTableComponent],
  templateUrl: './escalations-list.page.html',
  styleUrls: ['./escalations-list.page.scss'],
})
export class EscalationsListPage implements OnInit {
  escalations: Escalation[] = [];
  loading = false;

  columns: TableColumn<Escalation>[] = [
    {
      key: 'patientName',
      label: 'Patient',
      sortable: true,
      filterable: true,
      filterPlaceholder: 'Filter...',
      width: '160px',
    },
    {
      key: 'lastUpdate',
      label: 'Zuletzt',
      sortable: true,
      filterable: true,
      filterPlaceholder: 'Filter...',
      width: '120px',
    },
    {
      key: 'message',
      label: 'Nachricht',
      sortable: true,
      filterable: true,
      filterPlaceholder: 'Filter...',
    },
    {
      key: 'priority',
      label: 'Priorität',
      type: 'badge',
      sortable: true,
      filterable: true,
      filterPlaceholder: 'Filter...',
      width: '110px',
      cssClass: (e) => {
        const priority = (e.priority ?? '').toLowerCase().replace(/[\s/]+/g, '-');
        return priority ? `priority-${priority}` : '';
      },
    },
  ];

  rowActions: TableRowAction<Escalation>[] = [
    {
      label: 'Öffnen',
      icon: 'chatbox-ellipses-outline',
      onClick: (e) => this.onOpenEscalation(e),
    },
  ];

  constructor(
    private escalationService: EscalationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private appRef: ApplicationRef
  ) {}

  ngOnInit(): void {
    this.loadEscalations();
  }

  loadEscalations(): void {
    this.loading = true;
    this.escalationService.getEscalations().subscribe({
      next: (data) => {
        this.escalations = data;
        this.loading = false;
        this.cdr.detectChanges();
        this.appRef.tick();
      },
      error: () => {
        this.escalations = [];
        this.loading = false;
        this.cdr.detectChanges();
        this.appRef.tick();
      },
    });
  }

  onOpenEscalation(escalation: Escalation): void {
    console.log('Open escalation context for patient:', escalation.patientId);
    this.router.navigate(['/patients', escalation.patientId], {
      queryParams: { tab: 'chat' },
    });
  }
}
