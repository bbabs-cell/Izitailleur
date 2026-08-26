import { z } from "zod";
import { PRIORITIES } from "./order.schemas";

export const ISSUE_CATEGORIES = [
  "BAD_MEASUREMENT",
  "INSUFFICIENT_FABRIC",
  "DEFECTIVE_FABRIC",
  "BAD_CUT",
  "ALTERATION",
  "DELAY",
  "CUSTOMER_ABSENT",
  "MODEL_CHANGE",
  "MACHINE_BREAKDOWN",
  "APPRENTICE_LATE",
  "SUPPLIER_LATE",
  "PAYMENT",
  "DELIVERY",
  "OTHER",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const createIssueSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  category: z.enum(ISSUE_CATEGORIES),
  priority: z.enum(PRIORITIES).default("NORMAL"),
  orderId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  photoUrl: z.string().url().optional(),
});
export type CreateIssueDto = z.infer<typeof createIssueSchema>;

export const updateIssueStatusSchema = z.object({
  status: z.enum(ISSUE_STATUSES),
  solution: z.string().max(1000).optional(),
});
export type UpdateIssueStatusDto = z.infer<typeof updateIssueStatusSchema>;
