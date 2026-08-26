import type { UpdateWorkshopDto, WorkshopSettings } from "@izitailleur/shared";
import { apiClient } from "./client";

export const workshopApi = {
  get: () => apiClient.get<WorkshopSettings>("/workshop"),
  update: (dto: UpdateWorkshopDto) => apiClient.patch<WorkshopSettings>("/workshop", dto),
};
