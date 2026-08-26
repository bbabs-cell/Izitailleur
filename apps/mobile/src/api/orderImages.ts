import type { PresignedUpload } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface OrderImage {
  id: string;
  url: string;
}

export const orderImagesApi = {
  list: (orderId: string) => apiClient.get<OrderImage[]>(`/orders/${orderId}/images`),
  presignUpload: (orderId: string, contentType: string) =>
    apiClient.post<PresignedUpload>(`/orders/${orderId}/images/upload-url`, { contentType }),
  attach: (orderId: string, url: string) =>
    apiClient.post<OrderImage>(`/orders/${orderId}/images`, { url }),
};
