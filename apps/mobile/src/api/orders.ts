import type {
  CreateOrderDto,
  CreateOrderImageDto,
  CreateOrderTaskDto,
  OrderStatus,
} from "@izitailleur/shared";
import { apiClient } from "./client";

export interface OrderListItem {
  id: string;
  reference: string;
  modelName: string;
  status: OrderStatus;
  priority: string;
  dueDate: string;
  price: number;
  deposit: number;
  customer: { id: string; firstName: string; lastName: string };
}

export interface OrderTask {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string | null;
}

export interface OrderImage {
  id: string;
  url: string;
}

export interface OrderDetail extends OrderListItem {
  fabricDescription: string | null;
  quantity: number;
  instructions: string | null;
  notes: string | null;
  assignedTo: { id: string; fullName: string; role: string } | null;
  tasks: OrderTask[];
  images: OrderImage[];
  statusHistory: { toStatus: OrderStatus; changedAt: string }[];
}

export const ordersApi = {
  list: (status?: OrderStatus) => apiClient.get<OrderListItem[]>(`/orders${status ? `?status=${status}` : ""}`),
  get: (id: string) => apiClient.get<OrderDetail>(`/orders/${id}`),
  create: (dto: CreateOrderDto) => apiClient.post<OrderDetail>("/orders", dto),
  updateStatus: (id: string, status: OrderStatus) =>
    apiClient.patch<OrderDetail>(`/orders/${id}/status`, { status }),
  addTask: (id: string, dto: CreateOrderTaskDto) => apiClient.post<OrderTask>(`/orders/${id}/tasks`, dto),
  updateTaskStatus: (orderId: string, taskId: string, status: OrderTask["status"]) =>
    apiClient.patch<OrderTask>(`/orders/${orderId}/tasks/${taskId}/status`, { status }),
  addImage: (id: string, dto: CreateOrderImageDto) => apiClient.post<OrderImage>(`/orders/${id}/images`, dto),
};
