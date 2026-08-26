export const ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "TAILOR",
  "CUTTER",
  "APPRENTICE",
  "FINISHER",
  "DELIVERY",
] as const;

export type Role = (typeof ROLES)[number];

export const FINANCE_VISIBLE_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER"];

export function canViewFinance(role: Role): boolean {
  return FINANCE_VISIBLE_ROLES.includes(role);
}
