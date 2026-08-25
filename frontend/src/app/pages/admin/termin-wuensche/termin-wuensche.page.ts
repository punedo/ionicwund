import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminShellComponent } from '../../../components/admin-shell/admin-shell.component';
import { TerminWunschService, TerminWunsch } from '../../../services/termin-wunsch.service';
import { LoadingService } from '../../../services/loading.service';

@Component({
  selector: 'app-termin-wuensche',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminShellComponent],
  templateUrl: './termin-wuensche.page.html',
  styleUrls: ['./termin-wuensche.page.scss'],
})
export class TerminWuenschePage implements OnInit {
  terminWuensche: TerminWunsch[] = [];
  loading = true;
  selectedWunsch: TerminWunsch | null = null;
  rejectNotes = '';

  constructor(
    private terminWunschService: TerminWunschService,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.loadTerminWuensche();
  }

  loadTerminWuensche(): void {
    this.loading = true;
    this.terminWunschService.getTerminWuensche().subscribe({
      next: (data) => {
        this.terminWuensche = data.wuensche;
        this.loading = false;
      },
      error: () => {
        this.terminWuensche = [];
        this.loading = false;
      },
    });
  }

  acceptWunsch(wunsch: TerminWunsch): void {
    this.loadingService.show('Terminwunsch wird angenommen …');
    this.terminWunschService.acceptTerminWunsch(wunsch.id).pipe(
      finalize(() => {
        this.loadingService.hide();
      })
    ).subscribe({
      next: () => {
        this.loadTerminWuensche();
        alert('Terminwunsch wurde angenommen und als Termin erstellt.');
      },
      error: () => {
        alert('Fehler beim Annehmen des Terminwunsches.');
      },
    });
  }

  openRejectModal(wunsch: TerminWunsch): void {
    this.selectedWunsch = wunsch;
    this.rejectNotes = '';
  }

  closeRejectModal(): void {
    this.selectedWunsch = null;
    this.rejectNotes = '';
  }

  rejectWunsch(): void {
    if (!this.selectedWunsch) return;

    this.loadingService.show('Terminwunsch wird abgelehnt …');
    this.terminWunschService.rejectTerminWunsch(this.selectedWunsch.id, this.rejectNotes).pipe(
      finalize(() => {
        this.loadingService.hide();
      })
    ).subscribe({
      next: () => {
        this.closeRejectModal();
        this.loadTerminWuensche();
        alert('Terminwunsch wurde abgelehnt.');
      },
      error: () => {
        alert('Fehler beim Ablehnen des Terminwunsches.');
      },
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ausstehend':
        return 'Ausstehend';
      case 'angenommen':
        return 'Angenommen';
      case 'abgelehnt':
        return 'Abgelehnt';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ausstehend':
        return 'amber';
      case 'angenommen':
        return 'green';
      case 'abgelehnt':
        return 'red';
      default:
        return '';
    }
  }
}
