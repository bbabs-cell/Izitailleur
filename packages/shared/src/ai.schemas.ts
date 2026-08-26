import { z } from "zod";

export const askAiSchema = z.object({
  question: z.string().min(1).max(300),
});
export type AskAiDto = z.infer<typeof askAiSchema>;

export const AI_INTENTS = [
  "TODAY",
  "LATE_ORDERS",
  "ORDER_ASSIGNEE",
  "DEBTS",
  "LOW_STOCK",
  "LATE_REASONS",
  "UNKNOWN",
] as const;
export type AiIntent = (typeof AI_INTENTS)[number];

export interface AiAnswer {
  intent: AiIntent;
  answer: string;
  data: unknown;
}
