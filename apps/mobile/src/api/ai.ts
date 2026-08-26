import type { AiAnswer } from "@izitailleur/shared";
import { apiClient } from "./client";

export const aiApi = {
  ask: (question: string) => apiClient.post<AiAnswer>("/ai/ask", { question }),
};
