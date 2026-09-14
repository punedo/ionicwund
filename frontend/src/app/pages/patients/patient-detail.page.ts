import { Component, OnInit, ChangeDetectorRef, ApplicationRef } from '@angular/core';
import { of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminShellComponent } from '../../components/admin-shell/admin-shell.component';
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';
import { LoadingService } from '../../services/loading.service';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { ChatMessage, ChatRecipient } from '../../models/chat-message.model';
import { AppointmentService, Appointment, Certificate } from '../../services/appointment.service';
import { PredictionService } from '../../services/prediction.service';
import { WoundImageService } from '../../services/wound-image.service';
import { WoundPrediction } from '../../models/wound-prediction.model';
import { WoundImage } from '../../models/wound-image.model';

type DetailTab = 'overview' | 'wound' | 'medication' | 'supplies' | 'tasks' | 'appointments' | 'chat' | 'documents';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminShellComponent],
  templateUrl: './patient-detail.page.html',
  styleUrls: ['./patient-detail.page.v2.scss'],
})
export class PatientDetailPage implements OnInit {
  patient: Patient | null = null;
  loading = false;
  notFound = false;
  loadError: string | null = null;
  activeTab: DetailTab = 'overview';
  selectedStatus = 'Aktiv';
  expandedArtikel = new Set<string>();
  selectedDokFolder: 'anamnese' | 'kv' | 'genehmigungen' | 'verordnungen' | null = null;
  matWechsel = 2.33;
  matZeitraum = 4;
  trendAlert = false;
  trendPct = '+18% Flächenzunahme';
  chatMessages: ChatMessage[] = [];
  chatRecipients: ChatRecipient[] = [];
  selectedRecipientId: number | null = null;
  newChatMessage = '';
  chatLoading = false;
  chatError: string | null = null;
  appointments: Appointment[] = [];
  certificates: Certificate[] = [];
  appointmentsLoading = false;

  prediction: WoundPrediction | null = null;
  predictionLoading = false;
  predictionError: string | null = null;
  woundPhotoPreview: string | null = null;
  woundPhotoFile: File | null = null;

  woundImages: WoundImage[] = [];
  woundImagesLoading = false;

  tabs: { id: DetailTab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Übersicht' },
    { id: 'wound', label: 'Wundverlauf' },
    { id: 'medication', label: 'Medikation' },
    { id: 'supplies', label: 'Versorgungen' },
    { id: 'tasks', label: 'Aufgaben' },
    { id: 'appointments', label: 'Termine' },
    { id: 'chat', label: 'Chat', badge: 1 },
    { id: 'documents', label: 'Dokumente' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService,
    private loadingService: LoadingService,
    private authService: AuthService,
    private chatService: ChatService,
    private appointmentService: AppointmentService,
    private predictionService: PredictionService,
    private woundImageService: WoundImageService,
    private cdr: ChangeDetectorRef,
    private appRef: ApplicationRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/woundcare']);
      return;
    }

    const statePatient = (history.state as { patient?: Patient }).patient;
    if (statePatient) {
      this.patient = statePatient;
    }

    this.loadPatient(id);
    this.loadWoundHistory(id);
  }

  loadPatient(id: number): void {
    this.loading = true;
    this.notFound = false;
    this.loadError = null;
    this.loadingService.show();
    this.patientService.getPatient(id).pipe(
      timeout(10000),
      catchError((err) => {
        console.error('[PatientDetail] load error:', err);
        return of(null);
      })
    ).subscribe((p) => {
      this.loading = false;
      this.loadingService.hide();
      if (p) {
        this.patient = p;
        if (this.activeTab === 'chat') {
          this.loadChatMessages();
        }
      } else {
        this.patient = null;
        this.notFound = true;
        this.loadError = 'Patient konnte nicht geladen werden (Timeout oder Fehler).';
      }
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  loadWoundHistory(patientId: number): void {
    this.woundImagesLoading = true;
    this.woundImageService.getWoundImages(patientId).subscribe((images) => {
      this.woundImages = images.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      this.woundImagesLoading = false;
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  selectTab(tab: DetailTab): void {
    this.activeTab = tab;
    if (tab === 'chat' && this.patient) {
      this.loadChatMessages();
    }
    if (tab === 'appointments' && this.patient) {
      this.loadAppointments();
    }
  }

  fullName(p: Patient): string {
    return `${p.firstName} ${p.lastName}`;
  }

  displayName(): string {
    return this.patient ? this.fullName(this.patient) : 'Patient';
  }

  editPatient(): void {
    // Placeholder for edit navigation
    console.log('Edit patient', this.patient?.id);
  }

  handover(): void {
    console.log('Handover patient', this.patient?.id);
  }

  selectStatus(status: string): void {
    this.selectedStatus = status;
  }

  get isArzt(): boolean {
    return this.authService.getCurrentUser()?.roles.includes('ROLE_ARZT') ?? false;
  }

  get isHomecare(): boolean {
    return this.authService.getCurrentUser()?.roles.includes('ROLE_HOMECARE') ?? false;
  }

  get isWundexpertin(): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return false;
    }
    return user.roles.includes('ROLE_PFLEGE') || user.roles.includes('ROLE_WUNDEXPERTE');
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  toggleArtikel(key: string): void {
    if (this.expandedArtikel.has(key)) {
      this.expandedArtikel.delete(key);
    } else {
      this.expandedArtikel.add(key);
    }
  }

  isArtikelOpen(key: string): boolean {
    return this.expandedArtikel.has(key);
  }

  matResult(per: number): number {
    return Math.ceil(per * this.matWechsel * this.matZeitraum);
  }

  simulateTrend(): void {
    this.trendAlert = !this.trendAlert;
  }

  loadChatMessages(): void {
    if (!this.patient) {
      return;
    }

    this.chatLoading = true;
    this.chatError = null;
    this.chatService.getMessages(this.patient.id).subscribe((messages) => {
      this.chatMessages = messages;
      this.chatLoading = false;
      this.cdr.detectChanges();
      this.appRef.tick();
    });

    this.chatService.getRecipients().subscribe((recipients) => {
      this.chatRecipients = recipients;
      this.selectedRecipientId = this.resolveDefaultRecipient()?.id ?? null;
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  private resolveDefaultRecipient(): ChatRecipient | null {
    if (!this.patient || this.chatRecipients.length === 0) {
      return null;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    const others = this.chatRecipients.filter((r) => r.id !== currentUser.id);

    // Wundexperte -> relevant doctor is the treating doctor
    if (this.isWundexpertin) {
      const target = this.patient.treatingDoctor ?? '';
      return this.matchRecipient(others, target, 'Arzt') ?? others.find((r) => r.role === 'Arzt') ?? null;
    }

    // Arzt -> relevant recipient is the responsible wound expert
    if (this.isArzt) {
      const target = this.patient.responsibleWoundExpert ?? '';
      return this.matchRecipient(others, target, 'Wundexperte') ?? others.find((r) => r.role === 'Wundexperte') ?? null;
    }

    return others[0] ?? null;
  }

  private matchRecipient(recipients: ChatRecipient[], name: string, role: string): ChatRecipient | null {
    if (!name) {
      return null;
    }
    const needle = name.toLowerCase();
    const candidates = recipients.filter((r) => r.role === role);

    // full-name containment
    const exact = candidates.find(
      (r) => r.fullName.toLowerCase().includes(needle) || needle.includes(r.fullName.toLowerCase())
    );
    if (exact) {
      return exact;
    }

    // last-name token match
    const tokens = name.split(/[^\p{L}]+/u).filter((t) => t.length > 2);
    return (
      candidates.find((r) =>
        tokens.some((t) => r.fullName.toLowerCase().includes(t.toLowerCase()))
      ) ?? null
    );
  }

  loadAppointments(): void {
    if (!this.patient) {
      return;
    }

    this.appointmentsLoading = true;
    this.appointmentService.getAppointmentsByPatient(this.patient.id).subscribe((appointments) => {
      this.appointments = appointments;
      this.certificates = appointments
        .filter((a) => a.recordedAt || a.status === 'durchgeführt')
        .map((a) => ({
          id: a.id,
          patientName: a.patientName,
          date: this.formatAppointmentDate(a.date),
          serviceType: this.getServiceDisplay(a),
          recording: a.recordedAt ? 'Hochgeladen' : '—',
          status: a.recordedAt ? 'Vollständig' : 'Offen',
        }));
      this.appointmentsLoading = false;
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  formatAppointmentDate(dateStr: string): string {
    const date = new Date(dateStr);
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const weekday = weekdays[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${weekday}. ${day}.${month}.${year}`;
  }

  getServiceDisplay(appointment: Appointment): string {
    const duration = this.getDuration(appointment.startTime, appointment.endTime);
    const type = appointment.serviceType || 'Verbandwechsel';
    return `${duration} Min ${type} ambulant`;
  }

  getDuration(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return endH * 60 + endM - (startH * 60 + startM);
  }

  getCareType(appointment: Appointment): string {
    const rep = (appointment.repetition || '').toLowerCase();
    if (rep.includes('folge')) {
      return 'Folgeversorgung';
    }
    if (rep.includes('erst')) {
      return 'Erstversorgung';
    }
    return '—';
  }

  getBillingStatus(appointment: Appointment): { label: string; css: string } {
    if (appointment.serviceType === 'Videosprechstunde') {
      return { label: 'nicht abrechenbar', css: '' };
    }
    if (appointment.status === 'durchgeführt' && appointment.recordedAt) {
      return { label: 'Abgerechnet', css: 'green' };
    }
    if (appointment.status === 'durchgeführt') {
      return { label: 'Nachweis offen', css: 'amber' };
    }
    return { label: appointment.status || 'geplant', css: '' };
  }

  isVideoAppointment(appointment: Appointment): boolean {
    return appointment.serviceType === 'Videosprechstunde';
  }

  onRecordAppointment(appointment: Appointment): void {
    this.loadingService.show('Zeit wird erfasst...');
    this.appointmentService.recordTime(appointment.id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.loadAppointments();
      },
      error: () => {
        this.loadingService.hide();
        alert('Fehler bei der Zeiterfassung.');
      },
    });
  }

  onDeleteAppointment(appointment: Appointment): void {
    if (!confirm(`Termin am ${this.formatAppointmentDate(appointment.date)} wirklich löschen?`)) {
      return;
    }
    this.loadingService.show('Termin wird gelöscht...');
    this.appointmentService.deleteAppointment(appointment.id).subscribe({
      next: () => {
        this.loadingService.hide();
        this.loadAppointments();
      },
      error: () => {
        this.loadingService.hide();
        alert('Fehler beim Löschen des Termins.');
      },
    });
  }

  sendChatMessage(): void {
    if (!this.patient || !this.newChatMessage.trim()) {
      return;
    }

    const content = this.newChatMessage.trim();
    this.newChatMessage = '';
    this.chatLoading = true;

    this.chatService.sendMessage(this.patient.id, content, this.selectedRecipientId).subscribe((message) => {
      this.chatLoading = false;
      if (message) {
        this.chatMessages.push(message);
      } else {
        this.chatError = 'Nachricht konnte nicht gesendet werden.';
      }
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  openDokFolder(folder: 'anamnese' | 'kv' | 'genehmigungen' | 'verordnungen'): void {
    this.selectedDokFolder = folder;
  }

  closeDokFolder(): void {
    this.selectedDokFolder = null;
  }

  dokFolderTitle(): string {
    const titles = {
      anamnese: 'Anamnese',
      kv: 'KV',
      genehmigungen: 'Genehmigungen',
      verordnungen: 'Verordnungen',
    } as const;
    return this.selectedDokFolder ? titles[this.selectedDokFolder] : 'Verordnungen';
  }

  deletePatient(): void {
    if (this.patient && confirm(`${this.displayName()} wirklich unwiderruflich löschen? Alle Daten gehen verloren.`)) {
      console.log('Delete patient', this.patient.id);
    }
  }

  alert(message: string): void {
    window.alert(message);
  }

  print(): void {
    window.print();
  }

  birthYear(dob?: string): string {
    if (!dob) {
      return '';
    }
    const parts = dob.split('-');
    return parts.length >= 3 ? `(*${parts[2]}.${parts[1]}.${parts[0]})` : `(*${dob})`;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      return;
    }
    this.woundPhotoFile = file;
    this.predictionError = null;
    const reader = new FileReader();
    reader.onload = () => {
      this.woundPhotoPreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  analyzeWound(): void {
    if (!this.woundPhotoFile || !this.patient) {
      this.predictionError = 'Bitte zuerst ein Wundfoto auswählen.';
      return;
    }

    this.predictionLoading = true;
    this.predictionError = null;
    this.prediction = null;
    this.loadingService.show('Wunde wird analysiert…');

    this.predictionService.analyzeImage(this.woundPhotoFile).subscribe((result) => {
      this.predictionLoading = false;
      this.loadingService.hide();
      if (!result) {
        this.predictionError = 'Analyse fehlgeschlagen. Ist der Prediction-Service erreichbar?';
      } else {
        this.prediction = result;
        this.saveWoundImage(result);
      }
      this.cdr.detectChanges();
      this.appRef.tick();
    });
  }

  private saveWoundImage(prediction: WoundPrediction): void {
    if (!this.woundPhotoFile || !this.patient) {
      return;
    }
    this.woundImageService
      .saveWoundImage(this.patient.id, this.woundPhotoFile, prediction)
      .subscribe((saved) => {
        if (saved) {
          this.woundImages = [saved, ...this.woundImages];
          this.cdr.detectChanges();
          this.appRef.tick();
        }
      });
  }

  getArmstrongGrade(): string | null {
    const wagner = this.prediction?.wagner_label ?? '';
    // Wagner 0-1 -> kein Ischemiezeichen, 2 -> ischemia/infektion, 3-4 -> Gangrän/Infektion
    if (wagner.startsWith('Wagner 0') || wagner.startsWith('Wagner 1')) {
      return 'Armstrong A';
    }
    if (wagner.startsWith('Wagner 2')) {
      return 'Armstrong B';
    }
    if (wagner.startsWith('Wagner 3')) {
      return 'Armstrong C';
    }
    if (wagner.startsWith('Wagner 4') || wagner.startsWith('Wagner 5')) {
      return 'Armstrong D';
    }
    return null;
  }

  formatConfidence(value: number | null): string {
    if (value === null || value === undefined) {
      return '';
    }
    return `${(value * 100).toFixed(1)}%`;
  }

  imageDataUrl(image: WoundImage): string | null {
    if (!image.imageData) {
      return null;
    }
    const ext = (image.originalFilename.split('.').pop() || 'jpg').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'bmp' ? 'image/bmp' : 'image/jpeg';
    return `data:${mime};base64,${image.imageData}`;
  }

  overlayDataUrl(image: WoundImage): string | null {
    if (!image.overlayData) {
      return null;
    }
    return `data:image/png;base64,${image.overlayData}`;
  }

  getArmstrongGradeForImage(image: WoundImage): string | null {
    const wagner = image.wagnerLabel ?? '';
    if (wagner.startsWith('Wagner 0') || wagner.startsWith('Wagner 1')) {
      return 'Armstrong A';
    }
    if (wagner.startsWith('Wagner 2')) {
      return 'Armstrong B';
    }
    if (wagner.startsWith('Wagner 3')) {
      return 'Armstrong C';
    }
    if (wagner.startsWith('Wagner 4') || wagner.startsWith('Wagner 5')) {
      return 'Armstrong D';
    }
    return null;
  }

  formatDateTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getRecentImagesForComparison(): WoundImage[] {
    return this.woundImages.slice(0, 2);
  }
}
