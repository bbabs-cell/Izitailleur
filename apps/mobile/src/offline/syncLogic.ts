import type { SyncMutationResult } from "@izitailleur/shared";

/**
 * Logique pure de synchronisation (sans I/O) — testable indépendamment de SQLite/réseau.
 * Le moteur réel (syncEngine.ts) appelle ces fonctions après avoir lu/écrit la base locale.
 */

export interface LocalRecordMeta {
  id: string;
  updatedAt: string;
  dirty: boolean;
  conflict: boolean;
}

/** Un enregistrement pull ne doit jamais écraser une modification locale encore en attente. */
export function shouldSkipPullOverwrite(pendingMutationIds: ReadonlySet<string>, recordId: string): boolean {
  return pendingMutationIds.has(recordId);
}

export type PushResultAction =
  | { kind: "clear-local"; serverRecord: unknown }
  | { kind: "mark-conflict"; serverRecord: unknown }
  | { kind: "mark-missing" }
  | { kind: "surface-error"; message: string };

/** Décide quoi faire localement après la réponse du serveur à une mutation poussée. */
export function decidePushResultAction(result: SyncMutationResult): PushResultAction {
  switch (result.status) {
    case "applied":
      return { kind: "clear-local", serverRecord: result.serverRecord };
    case "conflict":
      return { kind: "mark-conflict", serverRecord: result.serverRecord };
    case "not_found":
      return { kind: "mark-missing" };
    case "error":
      return { kind: "surface-error", message: result.message ?? "Synchronisation impossible" };
  }
}

/**
 * L'utilisateur choisit de garder sa version locale après un conflit : on repousse la même
 * donnée, mais avec la nouvelle base (updatedAt du serveur) pour que la prochaine tentative
 * ne soit pas de nouveau rejetée comme conflit.
 */
export function buildRequeueAfterKeepMine(newBaseUpdatedAt: string) {
  return { baseUpdatedAt: newBaseUpdatedAt };
}

export interface QueuedMutation {
  entity: string;
  id: string;
  op: "create" | "update" | "delete";
}

/** Une seule mutation en attente par (entity, id) : la plus récente écrase la précédente. */
export function collapseQueue(mutations: QueuedMutation[]): QueuedMutation[] {
  const byKey = new Map<string, QueuedMutation>();
  for (const mutation of mutations) {
    byKey.set(`${mutation.entity}:${mutation.id}`, mutation);
  }
  return [...byKey.values()];
}
