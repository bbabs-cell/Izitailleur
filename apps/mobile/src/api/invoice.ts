import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_BASE_URL, getAuthHeaders } from "./client";

export const invoiceApi = {
  async downloadAndShare(orderId: string, reference: string): Promise<void> {
    const headers = await getAuthHeaders();
    const fileUri = `${FileSystem.cacheDirectory}facture-${reference}.pdf`;

    const result = await FileSystem.downloadAsync(`${API_BASE_URL}/orders/${orderId}/invoice/pdf`, fileUri, {
      headers,
    });
    if (result.status !== 200) {
      throw new Error("Impossible de télécharger la facture.");
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(result.uri, { mimeType: "application/pdf" });
    }
  },
};
