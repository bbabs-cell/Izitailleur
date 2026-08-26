import type { IssueCategory, IssueStatus } from "@izitailleur/shared";

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  BAD_MEASUREMENT: "Mauvaise mesure",
  INSUFFICIENT_FABRIC: "Tissu insuffisant",
  DEFECTIVE_FABRIC: "Tissu défectueux",
  BAD_CUT: "Mauvaise coupe",
  ALTERATION: "Retouche",
  DELAY: "Retard",
  CUSTOMER_ABSENT: "Client absent",
  MODEL_CHANGE: "Changement de modèle",
  MACHINE_BREAKDOWN: "Machine en panne",
  APPRENTICE_LATE: "Apprenti en retard",
  SUPPLIER_LATE: "Fournisseur en retard",
  PAYMENT: "Paiement",
  DELIVERY: "Livraison",
  OTHER: "Autre",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
};
