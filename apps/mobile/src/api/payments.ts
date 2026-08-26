import type { CreatePaymentDto } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface Payment {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  createdAt: string;
  recordedBy: { id: string; fullName: string } | null;
  receipt: { id: string; number: string } | null;
}

export interface OrderPayments {
  price: number;
  deposit: number;
  totalPaid: number;
  balance: number;
  payments: Payment[];
}

export const paymentsApi = {
  list: (orderId: string) => apiClient.get<OrderPayments>(`/orders/${orderId}/payments`),
  create: (orderId: string, dto: CreatePaymentDto) =>
    apiClient.post<Payment & { receipt: { id: string; number: string } }>(
      `/orders/${orderId}/payments`,
      dto,
    ),
};
