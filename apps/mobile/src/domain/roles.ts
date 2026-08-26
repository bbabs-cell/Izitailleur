import type { Role } from "@izitailleur/shared";

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MANAGER: "Responsable",
  TAILOR: "Tailleur",
  CUTTER: "Coupeur",
  APPRENTICE: "Apprenti",
  FINISHER: "Finition",
  DELIVERY: "Livreur",
};

export function canManageTeam(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN";
}
