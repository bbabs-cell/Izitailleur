import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_BASE_URL, apiClient, getAuthHeaders } from "./client";

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

  async exportPaymentsCsvAndShare(): Promise<void> {
    const headers = await getAuthHeaders();
    const fileUri = `${FileSystem.cacheDirectory}paiements.csv`;

    const result = await FileSystem.downloadAsync(`${API_BASE_URL}/finance/export.csv`, fileUri, { headers });
    if (result.status !== 200) {
      throw new Error("Impossible de télécharger l'export.");
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(result.uri, { mimeType: "text/csv" });
    }
  },
};
