import type { GarmentModelDto } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface GarmentModel {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  referenceImageUrl: string | null;
  basePrice: number | null;
}

export const modelsApi = {
  list: () => apiClient.get<GarmentModel[]>("/models"),
  get: (id: string) => apiClient.get<GarmentModel>(`/models/${id}`),
  create: (dto: GarmentModelDto) => apiClient.post<GarmentModel>("/models", dto),
};
