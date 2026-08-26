import type { CreateAppointmentDto } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface Appointment {
  id: string;
  type: string;
  title: string;
  startAt: string;
  endAt: string | null;
  notes: string | null;
  customer: { id: string; firstName: string; lastName: string } | null;
  order: { id: string; reference: string; modelName: string } | null;
}

export interface AppointmentsResponse {
  appointments: Appointment[];
  busyDays: { date: string; count: number }[];
}

export const appointmentsApi = {
  list: (from: string, to: string) =>
    apiClient.get<AppointmentsResponse>(`/appointments?from=${from}&to=${to}`),
  create: (dto: CreateAppointmentDto) => apiClient.post<Appointment>("/appointments", dto),
  remove: (id: string) => apiClient.delete<void>(`/appointments/${id}`),
};
