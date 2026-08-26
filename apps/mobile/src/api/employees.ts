import type { InviteEmployeeDto } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface Employee {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  createdAt: string;
}

export const employeesApi = {
  list: () => apiClient.get<Employee[]>("/employees"),
  invite: (dto: InviteEmployeeDto) => apiClient.post<Employee>("/employees", dto),
  updateRole: (id: string, role: string) => apiClient.patch<Employee>(`/employees/${id}/role`, { role }),
  remove: (id: string) => apiClient.delete<void>(`/employees/${id}`),
};
