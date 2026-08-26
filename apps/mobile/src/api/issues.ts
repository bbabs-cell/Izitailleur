import type { CreateIssueDto, IssueStatus } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface Issue {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: IssueStatus;
  solution: string | null;
  order: { id: string; reference: string } | null;
  assignedTo: { id: string; fullName: string } | null;
  createdAt: string;
}

export const issuesApi = {
  list: (status?: IssueStatus) => apiClient.get<Issue[]>(`/issues${status ? `?status=${status}` : ""}`),
  create: (dto: CreateIssueDto) => apiClient.post<Issue>("/issues", dto),
  updateStatus: (id: string, status: IssueStatus, solution?: string) =>
    apiClient.patch<Issue>(`/issues/${id}/status`, { status, solution }),
};
