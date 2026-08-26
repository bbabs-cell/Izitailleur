import type { SupplierDto } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  notes: string | null;
}

export const suppliersApi = {
  list: () => apiClient.get<Supplier[]>("/suppliers"),
  create: (dto: SupplierDto) => apiClient.post<Supplier>("/suppliers", dto),
  remove: (id: string) => apiClient.delete<void>(`/suppliers/${id}`),
};
