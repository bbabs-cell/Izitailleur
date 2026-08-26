import type {
  CreateMeasurementDto,
  CreateMeasurementProfileDto,
  CustomerDto,
} from "@izitailleur/shared";
import { apiClient } from "./client";

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
}

export interface MeasurementProfile {
  id: string;
  label: string;
  createdAt: string;
}

export interface Measurement {
  id: string;
  values: Record<string, number>;
  recordedAt: string;
}

export interface CustomerDetail extends Customer {
  measurementProfiles: MeasurementProfile[];
  orders: { id: string; reference: string; modelName: string; status: string }[];
}

export const customersApi = {
  list: (search?: string) =>
    apiClient.get<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  get: (id: string) => apiClient.get<CustomerDetail>(`/customers/${id}`),
  create: (dto: CustomerDto) => apiClient.post<Customer>("/customers", dto),
  createMeasurementProfile: (customerId: string, dto: CreateMeasurementProfileDto) =>
    apiClient.post<MeasurementProfile>(`/customers/${customerId}/measurement-profiles`, dto),
  listMeasurements: (profileId: string) =>
    apiClient.get<Measurement[]>(`/customers/measurement-profiles/${profileId}/measurements`),
  addMeasurement: (profileId: string, dto: CreateMeasurementDto) =>
    apiClient.post<Measurement>(`/customers/measurement-profiles/${profileId}/measurements`, dto),
};
