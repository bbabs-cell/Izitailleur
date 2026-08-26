import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_BASE_URL, apiClient, getAuthHeaders } from "./client";

export interface ReceiptDetail {
  id: string;
  number: string;
  amount: number;
  method: string;
  createdAt: string;
  workshop: { name: string; phone: string | null; address: string | null };
  order: {
    reference: string;
    modelName: string;
    customer: { firstName: string; lastName: string };
  };
}

export const receiptsApi = {
  get: (id: string) => apiClient.get<ReceiptDetail>(`/receipts/${id}`),

  async downloadAndShare(id: string, number: string): Promise<void> {
    const headers = await getAuthHeaders();
    const fileUri = `${FileSystem.cacheDirectory}recu-${number}.pdf`;

    const result = await FileSystem.downloadAsync(`${API_BASE_URL}/receipts/${id}/pdf`, fileUri, {
      headers,
    });
    if (result.status !== 200) {
      throw new Error("Impossible de télécharger le reçu.");
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(result.uri, { mimeType: "application/pdf" });
    }
  },
};
