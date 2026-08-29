import type { ExpenseDto } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string | null;
  spentAt: string;
  recordedBy: { id: string; fullName: string } | null;
}

export const expensesApi = {
  list: () => apiClient.get<Expense[]>("/expenses"),
  create: (dto: ExpenseDto) => apiClient.post<Expense>("/expenses", dto),
  remove: (id: string) => apiClient.delete<void>(`/expenses/${id}`),
};
