import type { NotificationType } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntity: string | null;
  relatedEntityId: string | null;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: (unreadOnly?: boolean) =>
    apiClient.get<Notification[]>(`/notifications${unreadOnly ? "?unread=true" : ""}`),
  scan: () => apiClient.post<Notification[]>("/notifications/scan"),
  markRead: (id: string) => apiClient.patch<Notification>(`/notifications/${id}/read`, {}),
};
