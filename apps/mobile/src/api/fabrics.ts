import type { CreateFabricMovementDto, FabricDto } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface Fabric {
  id: string;
  name: string;
  reference: string | null;
  color: string | null;
  quantity: number;
  unit: string;
  lowStock?: boolean;
  supplier: { id: string; name: string } | null;
}

export interface FabricMovement {
  id: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  note: string | null;
  createdAt: string;
}

export interface FabricDetail extends Fabric {
  movements: FabricMovement[];
}

export const fabricsApi = {
  list: () => apiClient.get<Fabric[]>("/fabrics"),
  lowStock: () => apiClient.get<Fabric[]>("/fabrics/low-stock"),
  get: (id: string) => apiClient.get<FabricDetail>(`/fabrics/${id}`),
  create: (dto: FabricDto) => apiClient.post<Fabric>("/fabrics", dto),
  recordMovement: (id: string, dto: CreateFabricMovementDto) =>
    apiClient.post<Fabric>(`/fabrics/${id}/movements`, dto),
};
