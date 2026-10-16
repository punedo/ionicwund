/**
 * Map between the API/frontend models and the local SQLite entities.
 */

import { Patient, PatientCreateRequest } from '../models/patient.model';
import { Appointment, AppointmentCreateRequest } from '../services/appointment.service';
import { Order, OrderCreateRequest } from '../models/order.model';
import { Doctor } from '../models/doctor.model';
import { Facility } from '../models/facility.model';
import { TerminWunsch } from '../services/termin-wunsch.service';
import { WoundImage } from '../models/wound-image.model';
import {
  LocalAppointment,
  LocalDoctor,
  LocalFacility,
  LocalInsuranceCompany,
  LocalOrder,
  LocalPatient,
  LocalProduct,
  LocalTerminWunsch,
  LocalWoundImage,
} from './local/local.models';

export function toLocalPatient(p: Patient | PatientCreateRequest, existing?: LocalPatient): LocalPatient {
  const req = p as any;
  const base: LocalPatient = existing ?? {
    id: req.clientUuid ?? '',
    serverId: typeof req.id === 'number' ? req.id : null,
    firstName: '',
    lastName: '',
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  };
  return {
    ...base,
    id: base.id,
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
    clientUuid: l.id,
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
    patientLocalId: req.patientLocalId ?? base.patientLocalId,
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
    clientUuid: l.id,
    patientId: l.patientId ?? 0,
    patientLocalId: l.patientLocalId ?? undefined,
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
  const req = d as any;
  const base = existing ?? {
    id: req.clientUuid ?? '',
    serverId: typeof req.id === 'number' ? req.id : null,
    name: '',
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  } as LocalDoctor;
  return {
    ...base,
    id: base.id,
    name: d.name ?? base.name,
    type: d.type,
    city: d.city,
    phone: d.phone,
    email: d.email,
    status: d.status,
    facilityId: d.facilityId != null ? String(d.facilityId) : (d.facility ? undefined : base.facilityId),
    facility: d.facility ?? base.facility,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalDoctor(l: LocalDoctor): Doctor {
  return {
    id: l.serverId ?? 0,
    clientUuid: l.id,
    name: l.name,
    type: l.type ?? undefined,
    city: l.city ?? undefined,
    phone: l.phone ?? undefined,
    email: l.email ?? undefined,
    status: l.status ?? undefined,
    facilityId: l.facilityId ? (Number(l.facilityId) || null) : null,
    facility: l.facility ?? null,
    createdAt: l.createdAt ?? undefined,
  };
}

export function toLocalFacility(f: Facility, existing?: LocalFacility): LocalFacility {
  const req = f as any;
  const base = existing ?? {
    id: req.clientUuid ?? '',
    serverId: typeof req.id === 'number' ? req.id : null,
    name: '',
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  } as LocalFacility;
  return {
    ...base,
    id: base.id,
    name: f.name ?? base.name,
    type: f.type,
    city: f.city,
    status: f.status,
    patientCount: f.patientCount ?? base.patientCount,
    careServices: f.careServices ?? base.careServices,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalFacility(l: LocalFacility): Facility {
  return {
    id: l.serverId ?? 0,
    clientUuid: l.id,
    name: l.name,
    type: l.type ?? undefined,
    city: l.city ?? undefined,
    patientCount: l.patientCount ?? 0,
    careServices: l.careServices ?? [],
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
    patientLocalId: t.patientLocalId ?? base.patientLocalId,
    patientName: t.patientName,
    preferredDate: t.preferredDate ?? base.preferredDate,
    preferredTime: t.preferredTime,
    notes: t.notes ?? undefined,
    status: t.status,
    reviewedBy: t.reviewedBy ?? undefined,
    reviewedAt: t.reviewedAt ?? undefined,
    reviewNotes: t.reviewNotes ?? undefined,
    convertedAppointmentId: t.convertedAppointmentId != null ? String(t.convertedAppointmentId) : undefined,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalTerminWunsch(l: LocalTerminWunsch): TerminWunsch {
  return {
    id: l.serverId ?? 0,
    clientUuid: l.id,
    patientId: l.patientId ?? 0,
    patientLocalId: l.patientLocalId ?? undefined,
    patientName: l.patientName ?? '',
    preferredDate: l.preferredDate,
    preferredTime: l.preferredTime ?? '',
    notes: l.notes ?? null,
    status: l.status as any,
    reviewedBy: l.reviewedBy ?? null,
    reviewedAt: l.reviewedAt ?? null,
    reviewNotes: l.reviewNotes ?? null,
    createdAt: l.createdAt,
    convertedAppointmentId: l.convertedAppointmentId as any ?? null,
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
    unit: p.unit ?? undefined,
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
    type: p.type ?? undefined,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalInsuranceCompany(l: LocalInsuranceCompany): { id: number; name: string; type: string } {
  return { id: l.serverId ?? 0, name: l.name, type: l.type ?? '' };
}

export function toLocalWoundImage(
  w: WoundImage,
  patientId: string,
  existing?: LocalWoundImage
): LocalWoundImage {
  const base: LocalWoundImage = existing ?? {
    id: '',
    serverId: w.id ?? null,
    patientId,
    imageData: w.imageData ?? undefined,
    overlayData: w.overlayData ?? undefined,
    originalFilename: w.originalFilename,
    predictionLabel: w.predictionLabel ?? undefined,
    confidence: w.confidence ?? undefined,
    detected: w.detected,
    routeLabel: w.routeLabel ?? undefined,
    routeConf: w.routeConf ?? undefined,
    wagnerLabel: w.wagnerLabel ?? undefined,
    wagnerConf: w.wagnerConf ?? undefined,
    epuapLabel: w.epuapLabel ?? undefined,
    epuapConf: w.epuapConf ?? undefined,
    ceapLabel: w.ceapLabel ?? undefined,
    ceapConf: w.ceapConf ?? undefined,
    syncStatus: 'pending',
    lastSyncTime: null,
    createdAt: '',
    updatedAt: '',
    pendingOperation: 'NONE',
  };
  return {
    ...base,
    patientId,
    imageData: w.imageData ?? base.imageData,
    overlayData: w.overlayData ?? base.overlayData,
    originalFilename: w.originalFilename ?? base.originalFilename,
    predictionLabel: w.predictionLabel ?? base.predictionLabel,
    confidence: w.confidence ?? base.confidence,
    detected: w.detected ?? base.detected,
    routeLabel: w.routeLabel ?? base.routeLabel,
    routeConf: w.routeConf ?? base.routeConf,
    wagnerLabel: w.wagnerLabel ?? base.wagnerLabel,
    wagnerConf: w.wagnerConf ?? base.wagnerConf,
    epuapLabel: w.epuapLabel ?? base.epuapLabel,
    epuapConf: w.epuapConf ?? base.epuapConf,
    ceapLabel: w.ceapLabel ?? base.ceapLabel,
    ceapConf: w.ceapConf ?? base.ceapConf,
    pendingOperation: existing ? 'UPDATE' : 'CREATE',
    syncStatus: 'pending',
  };
}

export function fromLocalWoundImage(l: LocalWoundImage): WoundImage {
  return {
    id: l.serverId ?? 0,
    clientUuid: l.id,
    imageData: l.imageData ?? null,
    overlayData: l.overlayData ?? null,
    originalFilename: l.originalFilename ?? '',
    predictionLabel: l.predictionLabel ?? null,
    confidence: l.confidence ?? null,
    detected: l.detected ?? false,
    routeLabel: l.routeLabel ?? null,
    routeConf: l.routeConf ?? null,
    wagnerLabel: l.wagnerLabel ?? null,
    wagnerConf: l.wagnerConf ?? null,
    epuapLabel: l.epuapLabel ?? null,
    epuapConf: l.epuapConf ?? null,
    ceapLabel: l.ceapLabel ?? null,
    ceapConf: l.ceapConf ?? null,
    createdAt: l.createdAt,
  };
}
