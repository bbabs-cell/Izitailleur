import { apiClient } from "./client";

export interface DebtEntry {
  orderId: string;
  reference: string;
  customer: { id: string; firstName: string; lastName: string; phone: string | null };
  total: number;
  paid: number;
  remaining: number;
  dueDate: string;
  lastPaymentAt: string | null;
}

export interface FinanceStats {
  ordersCount: number;
  deliveredCount: number;
  lateCount: number;
  revenue: number;
  unpaid: number;
  fabricConsumed: number;
  openIssues: number;
}

export const financeApi = {
  debts: () => apiClient.get<DebtEntry[]>("/finance/debts"),
  stats: () => apiClient.get<FinanceStats>("/finance/stats"),
};
