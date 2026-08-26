import type { SyncableEntity } from "@izitailleur/shared";
import { getDb } from "./db";

export interface QueueRow {
  entity: SyncableEntity;
  recordId: string;
  op: "create" | "update" | "delete";
  baseUpdatedAt: string | null;
  data: string | null;
  createdAt: string;
}

/**
 * Empile une mutation locale. Si une mutation est déjà en attente pour ce même
 * enregistrement, elle est fusionnée plutôt que dupliquée :
 * - create + update ultérieur (avant toute synchro) → reste une création, données mises à jour.
 * - create + suppression ultérieure (avant toute synchro) → annule simplement la création.
 * - update/delete écrasent la précédente mutation (la base reste celle du premier enregistrement
 *   connu du serveur, pas celle de la mutation précédente encore non synchronisée).
 */
export async function enqueueMutation(row: QueueRow): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<QueueRow>(
    "SELECT * FROM mutation_queue WHERE entity = ? AND recordId = ?",
    row.entity,
    row.recordId,
  );

  if (existing?.op === "create" && row.op === "delete") {
    await removeFromQueue(row.entity, row.recordId);
    return;
  }

  const merged: QueueRow = {
    ...row,
    op: existing?.op === "create" && row.op !== "delete" ? "create" : row.op,
    baseUpdatedAt: existing?.op === "create" && row.op !== "delete" ? null : row.baseUpdatedAt,
  };

  await db.runAsync(
    `INSERT INTO mutation_queue (entity, recordId, op, baseUpdatedAt, data, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(entity, recordId) DO UPDATE SET
       op = excluded.op, baseUpdatedAt = excluded.baseUpdatedAt,
       data = excluded.data, createdAt = excluded.createdAt`,
    merged.entity,
    merged.recordId,
    merged.op,
    merged.baseUpdatedAt,
    merged.data,
    merged.createdAt,
  );
}

export async function listQueue(): Promise<QueueRow[]> {
  const db = await getDb();
  return db.getAllAsync<QueueRow>("SELECT * FROM mutation_queue ORDER BY createdAt ASC");
}

export async function removeFromQueue(entity: SyncableEntity, recordId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM mutation_queue WHERE entity = ? AND recordId = ?", entity, recordId);
}

export async function pendingIdsForEntity(entity: SyncableEntity): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ recordId: string }>(
    "SELECT recordId FROM mutation_queue WHERE entity = ?",
    entity,
  );
  return new Set(rows.map((r) => r.recordId));
}

export async function queueLength(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM mutation_queue");
  return row?.count ?? 0;
}
