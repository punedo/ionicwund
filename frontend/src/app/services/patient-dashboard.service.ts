import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { PatientService } from './patient.service';
import { AppointmentService, Appointment } from './appointment.service';
import { TerminWunschService, TerminWunsch } from './termin-wunsch.service';
import { Patient } from '../models/patient.model';
import {
  PatientDashboard,
  PatientProfile,
  PatientAppointment,
  ConsentItem,
  PatientDocument,
  CarePlan,
} from '../models/patient-dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class PatientDashboardService {
  constructor(
    private authService: AuthService,
    private patientService: PatientService,
    private appointmentService: AppointmentService,
    private terminWunschService: TerminWunschService
  ) {}

  loadDashboard(): Observable<PatientDashboard> {
    const user = this.authService.getCurrentUser();

    return this.patientService.getPatients().pipe(
      catchError(() => of([])),
      map((patients) => this.findMyPatient(user, patients)),
      switchMap((patient) =>
        this.appointmentService.getAppointments().pipe(
          catchError(() => of([])),
          switchMap((appointments) =>
            this.terminWunschService.getTerminWuensche().pipe(
              catchError(() => of({ wuensche: [] })),
              map((terminData) => this.buildDashboard(patient, appointments, terminData.wuensche))
            )
          )
        )
      )
    );
  }

  getFallbackDashboard(): PatientDashboard {
    const user = this.authService.getCurrentUser();
    return this.buildDashboard(this.fallbackPatient(user), [], []);
  }

  private findMyPatient(user: ReturnType<AuthService['getCurrentUser']>, patients: Patient[]): Patient {
    if (patients.length && user) {
      const matched = patients.find(
        (p) =>
          p.firstName?.toLowerCase() === (user.firstName ?? '').toLowerCase() &&
          p.lastName?.toLowerCase() === (user.lastName ?? '').toLowerCase()
      );
      if (matched) {
        return matched;
      }
    }

    if (patients.length) {
      return patients[0];
    }

    return this.fallbackPatient(user);
  }

  private fallbackPatient(user: ReturnType<AuthService['getCurrentUser']>): Patient {
    return {
      id: 0,
      firstName: user?.firstName ?? 'Patient',
      lastName: user?.lastName ?? '',
      dateOfBirth: '1954-02-04',
      gender: 'weiblich',
      woundType: 'Diabet. Fußsyndrom',
      score: 'Wagner 2 / Armstrong B',
      responsibleCareService: 'Pflegedienst Nord',
      responsibleWoundExpert: 'P. Meier',
      status: 'Beobachtung',
    };
  }

  private buildDashboard(patient: Patient, appointments: Appointment[], terminWuensche: TerminWunsch[]): PatientDashboard {
    const profile: PatientProfile = {
      id: patient.id ?? 0,
      firstName: patient.firstName,
      lastName: patient.lastName,
      fullName: `${patient.firstName} ${patient.lastName}`.trim(),
      woundType: patient.woundType ?? 'Diabet. Fußsyndrom',
      score: patient.score ?? 'Wagner 2 / Armstrong B',
      woundArea: '4,1 cm²',
      woundTrend: 'sinkt kontinuierlich',
      responsibleCareService: patient.responsibleCareService ?? 'Pflegedienst Nord',
      responsibleWoundExpert: patient.responsibleWoundExpert ?? 'P. Meier',
    };

    const patientAppointments: PatientAppointment[] = appointments
      .filter(
        (a) =>
          a.patientName?.toLowerCase() ===
            `${patient.lastName}, ${patient.firstName}`.toLowerCase() ||
          a.patientName?.toLowerCase() === profile.fullName.toLowerCase() ||
          a.patientId === patient.id
      )
      .map((a) => ({
        id: a.id,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        serviceType: a.serviceType ?? 'Verbandwechsel',
        provider: a.address ?? 'P. Meier',
      }));

    // Add accepted termin wishes as appointments
    const acceptedWuensche = terminWuensche
      .filter((w) => w.status === 'angenommen' && w.patientId === patient.id)
      .map((w) => ({
        id: w.id + 10000, // Offset to avoid ID conflicts
        date: w.preferredDate,
        startTime: w.preferredTime,
        endTime: w.preferredTime,
        serviceType: 'Verbandwechsel (Terminwunsch)',
        provider: 'Pflegedienst',
      }));

    const allAppointments = [...patientAppointments, ...acceptedWuensche];
    const nextAppointment = this.findNextAppointment(allAppointments) ?? this.defaultNextAppointment();

    const openConsents: ConsentItem[] = [
      { id: 1, title: 'Einwilligung Fotodokumentation', status: 'unterschrieben' },
      { id: 2, title: 'Einwilligung Datenweitergabe an Homecare-Anbieter', status: 'ausstehend' },
    ];

    const documents: PatientDocument[] = [
      { id: 1, name: 'Folgerezept_Foto.jpg', category: 'Rezept', date: '02.07.2026', status: 'Angenommen' },
      { id: 2, name: 'Einwilligung_Fotodoku.pdf', category: 'Einwilligung', date: '15.06.2026', status: 'Angenommen' },
      { id: 3, name: 'Arztbrief_Angiologie.pdf', category: 'Sonstiges', date: '28.06.2026', status: 'In Prüfung' },
    ];

    const carePlan: CarePlan = {
      nextVisitDate: nextAppointment?.date,
      interval: 'alle 2 Tage',
      material: 'Schaumverband Polyurethan',
      startedAt: '2026-06-12',
      estimatedEndDate: '2026-09-30',
      progressPercent: 61,
    };

    return {
      profile,
      nextAppointment,
      wound: profile,
      openConsents,
      documents,
      banner:
        'Ein Leistungsnachweis (21.07.2026) wartet auf Ihre Bestätigung.',
      carePlan,
    };
  }

  private findNextAppointment(appointments: PatientAppointment[]): PatientAppointment | null {
    const now = new Date().toISOString().split('T')[0];
    const future = appointments
      .filter((a) => a.date >= now)
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
    return future[0] ?? appointments[appointments.length - 1] ?? null;
  }

  private defaultNextAppointment(): PatientAppointment {
    return {
      id: 0,
      date: '2026-07-01',
      startTime: '11:00',
      endTime: '11:30',
      serviceType: 'Verbandwechsel',
      provider: 'P. Meier',
    };
  }
}
