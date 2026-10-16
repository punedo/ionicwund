import { Injectable } from '@angular/core';
import { DbService } from '../services/db.service';
import { BaseRepository } from './base.repository';
import {
  LocalPatient,
  LocalAppointment,
  LocalOrder,
  LocalDoctor,
  LocalFacility,
  LocalTerminWunsch,
  LocalProduct,
  LocalInsuranceCompany,
  LocalWoundImage,
} from '../local/local.models';

const PATIENT_COLUMNS: string[] = [
  'id', 'serverId', 'firstName', 'lastName', 'dateOfBirth', 'gender',
  'street', 'houseNumber', 'zip', 'city', 'phone', 'insuranceNumber',
  'insuranceType', 'insuranceCompany', 'insuranceClass', 'treatingDoctor',
  'additionalService', 'responsibleCareService', 'responsibleWoundExpert',
  'facility', 'woundType', 'score', 'responsible', 'lastDocumentedAt', 'status',
  'syncStatus', 'syncVersion', 'lastSyncTime', 'createdAt', 'updatedAt',
  'deletedAt', 'pendingOperation',
];

const APPOINTMENT_COLUMNS: string[] = [
  'id', 'serverId', 'patientId', 'patientLocalId', 'patientName', 'date', 'startTime', 'endTime',
  'serviceType', 'address', 'tour', 'repetition', 'status', 'recordedAt',
  'syncStatus', 'syncVersion', 'lastSyncTime', 'createdAt', 'updatedAt',
  'deletedAt', 'pendingOperation',
];

const ORDER_COLUMNS: string[] = [
  'id', 'serverId', 'patient', 'patientLocalId', 'orderNumber', 'orderDate',
  'type', 'facility', 'livingArea', 'desiredDeliveryDate', 'items',
  'status', 'syncStatus', 'syncVersion', 'lastSyncTime', 'createdAt', 'updatedAt',
  'deletedAt', 'pendingOperation',
];

const DOCTOR_COLUMNS: string[] = [
  'id', 'serverId', 'name', 'type', 'city', 'phone', 'email', 'status',
  'facilityId', 'facility',
  'syncStatus', 'syncVersion', 'lastSyncTime', 'createdAt', 'updatedAt',
  'deletedAt', 'pendingOperation',
];

const FACILITY_COLUMNS: string[] = [
  'id', 'serverId', 'name', 'type', 'city', 'status', 'patientCount', 'careServices',
  'syncStatus', 'syncVersion', 'lastSyncTime', 'createdAt', 'updatedAt',
  'deletedAt', 'pendingOperation',
];

const TERMIN_WUENSCH_COLUMNS: string[] = [
  'id', 'serverId', 'patientId', 'patientLocalId', 'patientName', 'preferredDate', 'preferredTime',
  'notes', 'status', 'reviewedBy', 'reviewedAt', 'reviewNotes', 'convertedAppointmentId',
  'syncStatus', 'syncVersion', 'lastSyncTime', 'createdAt', 'updatedAt',
  'deletedAt', 'pendingOperation',
];

const PRODUCT_COLUMNS: string[] = [
  'id', 'serverId', 'name', 'unit', 'category',
  'syncStatus', 'syncVersion', 'lastSyncTime', 'createdAt', 'updatedAt',
  'deletedAt', 'pendingOperation',
];

const INSURANCE_COMPANY_COLUMNS: string[] = [
  'id', 'serverId', 'name', 'type',
  'syncStatus', 'syncVersion', 'lastSyncTime', 'createdAt', 'updatedAt',
  'deletedAt', 'pendingOperation',
];

const WOUND_IMAGE_COLUMNS: string[] = [
  'id', 'serverId', 'patientId', 'imageData', 'overlayData', 'originalFilename',
  'predictionLabel', 'confidence', 'detected', 'routeLabel', 'routeConf',
  'wagnerLabel', 'wagnerConf', 'epuapLabel', 'epuapConf', 'ceapLabel', 'ceapConf',
  'localImageUri', 'serverImagePath',
  'syncStatus', 'syncVersion', 'lastSyncTime', 'createdAt', 'updatedAt',
  'deletedAt', 'pendingOperation',
];

@Injectable({
  providedIn: 'root',
})
export class Repositories {
  patients: BaseRepository<LocalPatient>;
  appointments: BaseRepository<LocalAppointment>;
  orders: BaseRepository<LocalOrder>;
  doctors: BaseRepository<LocalDoctor>;
  facilities: BaseRepository<LocalFacility>;
  terminWuensche: BaseRepository<LocalTerminWunsch>;
  products: BaseRepository<LocalProduct>;
  insuranceCompanies: BaseRepository<LocalInsuranceCompany>;
  woundImages: BaseRepository<LocalWoundImage>;

  constructor(db: DbService) {
    this.patients = new BaseRepository<LocalPatient>(db, 'patients', PATIENT_COLUMNS, ['responsible']);
    this.appointments = new BaseRepository<LocalAppointment>(db, 'appointments', APPOINTMENT_COLUMNS);
    this.orders = new BaseRepository<LocalOrder>(db, 'orders', ORDER_COLUMNS);
    this.doctors = new BaseRepository<LocalDoctor>(db, 'doctors', DOCTOR_COLUMNS);
    this.facilities = new BaseRepository<LocalFacility>(db, 'facilities', FACILITY_COLUMNS, ['careServices']);
    this.terminWuensche = new BaseRepository<LocalTerminWunsch>(db, 'terminWuensche', TERMIN_WUENSCH_COLUMNS);
    this.products = new BaseRepository<LocalProduct>(db, 'products', PRODUCT_COLUMNS);
    this.insuranceCompanies = new BaseRepository<LocalInsuranceCompany>(db, 'insuranceCompanies', INSURANCE_COMPANY_COLUMNS);
    this.woundImages = new BaseRepository<LocalWoundImage>(db, 'woundImages', WOUND_IMAGE_COLUMNS);
  }

  /**
   * Map a backend entity type string to the matching repository.
   */
  forEntityType(type: string): BaseRepository<any> | null {
    const map: Record<string, BaseRepository<any>> = {
      patient: this.patients,
      wound_image: this.woundImages,
      appointment: this.appointments,
      order: this.orders,
      termin_wunsch: this.terminWuensche,
      facility: this.facilities,
      doctor: this.doctors,
      product: this.products,
      insurance_company: this.insuranceCompanies,
    };
    return map[type] ?? null;
  }
}
