/**
 * Map between the API/frontend models and the local SQLite entities.
 */

import { Patient, PatientCreateRequest } from '../models/patient.model';
import { Appointment, AppointmentCreateRequest } from '../services/appointment.service';
import { Order, OrderCreateRequest } from '../models/order.model';
import { Doctor } from '../models/doctor.model';
import { Facility } from '../models/facility.model';
import { TerminWunsch } from '../services/termin-wunsch.service';
import {
  LocalAppointment,
  LocalDoctor,
  LocalFacility,
  LocalInsuranceCompany,
  LocalOrder,
  LocalPatient,
  LocalProduct,
  LocalTerminWunsch,
} from './local/local.models';

export function toLocalPatient(p: Patient | PatientCreateRequest, existing?: LocalPatient): LocalPatient {
  const base: LocalPatient = existing ?? {
    id: '',
    serverId: (p as Patient).id ?? null,
    firstName: '',
    lastName: '',
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  };
  const req = p as any;
  return {
    ...base,
    firstName: req.firstName ?? base.firstName,
    lastName: req.lastName ?? base.lastName,
    dateOfBirth: req.dateOfBirth ?? base.dateOfBirth,
    gender: req.gender ?? base.gender,
    street: req.street ?? base.street,
    houseNumber: req.houseNumber ?? base.houseNumber,
    zip: req.zip ?? base.zip,
    city: req.city ?? base.city,
    phone: req.phone ?? base.phone,
    insuranceNumber: req.insuranceNumber ?? base.insuranceNumber,
    insuranceType: req.insuranceType ?? base.insuranceType,
    insuranceCompany: req.insuranceCompany ?? base.insuranceCompany,
    insuranceClass: req.insuranceClass ?? base.insuranceClass,
    treatingDoctor: req.treatingDoctor ?? base.treatingDoctor,
    additionalService: req.additionalService ?? base.additionalService,
    responsibleCareService: req.responsibleCareService ?? base.responsibleCareService,
    responsibleWoundExpert: req.responsibleWoundExpert ?? base.responsibleWoundExpert,
    facility: req.facility ?? base.facility,
    woundType: req.woundType ?? base.woundType,
    score: req.score ?? base.score,
    responsible: Array.isArray(req.responsible) ? req.responsible : (base.responsible || []),
    lastDocumentedAt: req.lastDocumentedAt ?? base.lastDocumentedAt,
    status: req.status ?? base.status ?? 'neu',
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalPatient(l: LocalPatient): Patient {
  return {
    id: l.serverId ?? 0,
    firstName: l.firstName,
    lastName: l.lastName,
    dateOfBirth: l.dateOfBirth ?? undefined,
    gender: l.gender as any,
    street: l.street ?? undefined,
    houseNumber: l.houseNumber ?? undefined,
    zip: l.zip ?? undefined,
    city: l.city ?? undefined,
    phone: l.phone ?? undefined,
    insuranceNumber: l.insuranceNumber ?? undefined,
    insuranceType: l.insuranceType as any,
    insuranceCompany: l.insuranceCompany ?? undefined,
    insuranceClass: l.insuranceClass ?? undefined,
    treatingDoctor: l.treatingDoctor ?? undefined,
    additionalService: l.additionalService ?? undefined,
    responsibleCareService: l.responsibleCareService ?? undefined,
    responsibleWoundExpert: l.responsibleWoundExpert ?? undefined,
    facility: l.facility ?? undefined,
    woundType: l.woundType ?? undefined,
    score: l.score ?? undefined,
    responsible: l.responsible,
    lastDocumentedAt: l.lastDocumentedAt ?? undefined,
    status: l.status as any,
    createdAt: l.createdAt,
  };
}

export function toLocalAppointment(a: Appointment | AppointmentCreateRequest, existing?: LocalAppointment): LocalAppointment {
  const base: LocalAppointment = existing ?? {
    id: '',
    serverId: (a as Appointment).id ?? null,
    patientId: (a as Appointment).patientId ?? null,
    date: '',
    startTime: '',
    endTime: '',
    serviceType: '',
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  };
  const req = a as any;
  return {
    ...base,
    patientId: req.patientId ?? base.patientId,
    patientName: req.patientName ?? base.patientName,
    date: req.date ?? base.date,
    startTime: req.startTime ?? base.startTime,
    endTime: req.endTime ?? base.endTime,
    serviceType: req.serviceType ?? base.serviceType,
    address: req.address ?? base.address,
    tour: req.tour ?? base.tour,
    repetition: req.repetition ?? base.repetition,
    status: req.status ?? base.status,
    recordedAt: req.recordedAt ?? base.recordedAt,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalAppointment(l: LocalAppointment): Appointment {
  return {
    id: l.serverId ?? 0,
    patientId: l.patientId ?? 0,
    patientName: l.patientName ?? '',
    date: l.date,
    startTime: l.startTime,
    endTime: l.endTime,
    serviceType: l.serviceType,
    address: l.address ?? undefined,
    tour: l.tour ?? undefined,
    repetition: l.repetition ?? '',
    status: l.status ?? '',
    recordedAt: l.recordedAt ?? undefined,
    createdAt: l.createdAt,
  } as Appointment;
}

export function toLocalOrder(o: Order | OrderCreateRequest, existing?: LocalOrder): LocalOrder {
  const base: LocalOrder = existing ?? {
    id: '',
    serverId: (o as Order).id ?? null,
    type: '',
    items: '[]',
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  };
  const req = o as any;
  return {
    ...base,
    orderNumber: req.orderNumber ?? base.orderNumber,
    orderDate: req.orderDate ?? base.orderDate,
    type: req.type ?? base.type,
    facility: req.facility ?? base.facility,
    livingArea: req.livingArea ?? base.livingArea,
    patient: req.patient ?? base.patient,
    desiredDeliveryDate: req.desiredDeliveryDate ?? base.desiredDeliveryDate,
    items: Array.isArray(req.items) ? JSON.stringify(req.items) : base.items,
    status: req.status ?? base.status,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalOrder(l: LocalOrder): Order {
  return {
    id: l.serverId ?? 0,
    orderNumber: l.orderNumber ?? '',
    orderDate: l.orderDate ?? undefined,
    type: l.type as any,
    facility: l.facility ?? '',
    livingArea: l.livingArea ?? undefined,
    patient: l.patient ?? undefined,
    desiredDeliveryDate: l.desiredDeliveryDate ?? '',
    items: JSON.parse(l.items || '[]'),
    status: (l.status as any) ?? 'offen',
    createdAt: l.createdAt,
  };
}

export function toLocalDoctor(d: Doctor, existing?: LocalDoctor): LocalDoctor {
  const base = existing ?? {
    id: '',
    serverId: d.id ?? null,
    name: '',
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  } as LocalDoctor;
  return {
    ...base,
    name: d.name ?? base.name,
    type: d.type,
    city: d.city,
    phone: d.phone,
    email: d.email,
    status: d.status,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalDoctor(l: LocalDoctor): Doctor {
  return {
    id: l.serverId ?? 0,
    name: l.name,
    type: l.type ?? undefined,
    city: l.city ?? undefined,
    phone: l.phone ?? undefined,
    email: l.email ?? undefined,
    status: l.status ?? undefined,
    createdAt: l.createdAt ?? undefined,
  };
}

export function toLocalFacility(f: Facility, existing?: LocalFacility): LocalFacility {
  const base = existing ?? {
    id: '',
    serverId: f.id ?? null,
    name: '',
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  } as LocalFacility;
  return {
    ...base,
    name: f.name ?? base.name,
    type: f.type,
    city: f.city,
    status: f.status,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalFacility(l: LocalFacility): Facility {
  return {
    id: l.serverId ?? 0,
    name: l.name,
    type: l.type ?? undefined,
    city: l.city ?? undefined,
    patientCount: 0,
    careServices: [],
    status: l.status ?? undefined,
    createdAt: l.createdAt ?? undefined,
  };
}

export function toLocalTerminWunsch(t: TerminWunsch, existing?: LocalTerminWunsch): LocalTerminWunsch {
  const base = existing ?? {
    id: '',
    serverId: t.id ?? null,
    patientId: t.patientId ?? null,
    preferredDate: '',
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  } as LocalTerminWunsch;
  return {
    ...base,
    patientId: t.patientId ?? base.patientId,
    patientName: t.patientName,
    preferredDate: t.preferredDate ?? base.preferredDate,
    preferredTime: t.preferredTime,
    notes: t.notes,
    status: t.status,
    reviewedBy: t.reviewedBy,
    reviewedAt: t.reviewedAt,
    reviewNotes: t.reviewNotes,
    convertedAppointmentId: t.convertedAppointmentId,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalTerminWunsch(l: LocalTerminWunsch): TerminWunsch {
  return {
    id: l.serverId ?? 0,
    patientId: l.patientId ?? 0,
    patientName: l.patientName ?? '',
    preferredDate: l.preferredDate,
    preferredTime: l.preferredTime ?? '',
    notes: l.notes ?? null,
    status: l.status as any,
    reviewedBy: l.reviewedBy ?? null,
    reviewedAt: l.reviewedAt ?? null,
    reviewNotes: l.reviewNotes ?? null,
    createdAt: l.createdAt,
    convertedAppointmentId: l.convertedAppointmentId ?? null,
  };
}

export function toLocalProduct(p: { id?: number; name: string; unit?: string | null }, existing?: LocalProduct): LocalProduct {
  const base = existing ?? {
    id: '',
    serverId: p.id ?? null,
    name: p.name,
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  } as LocalProduct;
  return {
    ...base,
    name: p.name,
    unit: p.unit,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalProduct(l: LocalProduct): { id: number; name: string; unit: string } {
  return { id: l.serverId ?? 0, name: l.name, unit: l.unit ?? '' };
}

export function toLocalInsuranceCompany(p: { id?: number; name: string; type?: string | null }, existing?: LocalInsuranceCompany): LocalInsuranceCompany {
  const base = existing ?? {
    id: '',
    serverId: p.id ?? null,
    name: p.name,
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  } as LocalInsuranceCompany;
  return {
    ...base,
    name: p.name,
    type: p.type,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalInsuranceCompany(l: LocalInsuranceCompany): { id: number; name: string; type: string } {
  return { id: l.serverId ?? 0, name: l.name, type: l.type ?? '' };
}
