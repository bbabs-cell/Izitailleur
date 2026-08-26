import type { DashboardResponse } from "@izitailleur/shared";
import { apiClient } from "./client";

export const dashboardApi = {
  get: () => apiClient.get<DashboardResponse>("/dashboard"),
};
