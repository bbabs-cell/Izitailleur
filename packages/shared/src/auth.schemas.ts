import { z } from "zod";

export const registerSchema = z.object({
  workshopName: z.string().min(2).max(100),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  password: z.string().min(8).max(72),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  phone: z.string().min(8).max(20),
  password: z.string().min(8).max(72),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshDto = z.infer<typeof refreshSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;
