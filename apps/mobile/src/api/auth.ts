import type { AuthTokens, LoginDto, RegisterDto } from "@izitailleur/shared";
import { apiClient } from "./client";

export interface CurrentUser {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  workshopId: string;
  workshop: { id: string; name: string };
}

export const authApi = {
  register: (dto: RegisterDto) => apiClient.post<AuthTokens>("/auth/register", dto),
  login: (dto: LoginDto) => apiClient.post<AuthTokens>("/auth/login", dto),
  me: () => apiClient.get<CurrentUser>("/users/me"),
};
