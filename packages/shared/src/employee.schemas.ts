import { z } from "zod";
import { ROLES } from "./roles";

export const inviteEmployeeSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().min(8).max(20),
  password: z.string().min(8).max(72),
  role: z.enum(ROLES),
});
export type InviteEmployeeDto = z.infer<typeof inviteEmployeeSchema>;

export const updateEmployeeRoleSchema = z.object({
  role: z.enum(ROLES),
});
export type UpdateEmployeeRoleDto = z.infer<typeof updateEmployeeRoleSchema>;
