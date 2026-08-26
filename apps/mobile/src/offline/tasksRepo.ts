import * as Crypto from "expo-crypto";
import type { CreateOrderTaskDto } from "@izitailleur/shared";
import { getDb } from "./db";
import { enqueueMutation } from "./mutationQueue";

export interface LocalTask {
  id: string;
  orderId: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  localUpdatedAt: string;
  serverUpdatedAt: string | null;
  dirty: number;
  conflict: number;
  serverSnapshot: string | null;
}

export const tasksRepo = {
  async listByOrder(orderId: string): Promise<LocalTask[]> {
    const db = await getDb();
    return db.getAllAsync<LocalTask>(
      "SELECT * FROM tasks_local WHERE orderId = ? ORDER BY localUpdatedAt ASC",
      orderId,
    );
  },

  async create(orderId: string, data: CreateOrderTaskDto): Promise<LocalTask> {
    const db = await getDb();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO tasks_local (id, orderId, title, description, status, dueDate, localUpdatedAt, serverUpdatedAt, dirty, conflict)
       VALUES (?, ?, ?, ?, 'TODO', ?, ?, NULL, 1, 0)`,
      id,
      orderId,
      data.title,
      data.description ?? null,
      data.dueDate ?? null,
      now,
    );

    await enqueueMutation({
      entity: "task",
      recordId: id,
      op: "create",
      baseUpdatedAt: null,
      data: JSON.stringify({ ...data, orderId }),
      createdAt: now,
    });

    return {
      id,
      orderId,
      title: data.title,
      description: data.description ?? null,
      status: "TODO",
      dueDate: data.dueDate ?? null,
      localUpdatedAt: now,
      serverUpdatedAt: null,
      dirty: 1,
      conflict: 0,
      serverSnapshot: null,
    };
  },

  async updateStatus(id: string, status: "TODO" | "IN_PROGRESS" | "DONE"): Promise<void> {
    const db = await getDb();
    const existing = await db.getFirstAsync<LocalTask>("SELECT * FROM tasks_local WHERE id = ?", id);
    if (!existing) throw new Error("Tâche locale introuvable");
    const now = new Date().toISOString();

    await db.runAsync(
      "UPDATE tasks_local SET status = ?, localUpdatedAt = ?, dirty = 1 WHERE id = ?",
      status,
      now,
      id,
    );

    await enqueueMutation({
      entity: "task",
      recordId: id,
      op: "update",
      baseUpdatedAt: existing.serverUpdatedAt,
      data: JSON.stringify({ status }),
      createdAt: now,
    });
  },

  async applyServerRecord(record: {
    id: string;
    orderId: string;
    title: string;
    description: string | null;
    status: string;
    dueDate: string | null;
    updatedAt: string;
  }): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO tasks_local (id, orderId, title, description, status, dueDate, localUpdatedAt, serverUpdatedAt, dirty, conflict, serverSnapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL)
       ON CONFLICT(id) DO UPDATE SET
        orderId = excluded.orderId, title = excluded.title, description = excluded.description,
        status = excluded.status, dueDate = excluded.dueDate, localUpdatedAt = excluded.localUpdatedAt,
        serverUpdatedAt = excluded.serverUpdatedAt, dirty = 0, conflict = 0, serverSnapshot = NULL`,
      record.id,
      record.orderId,
      record.title,
      record.description,
      record.status,
      record.dueDate,
      record.updatedAt,
      record.updatedAt,
    );
  },

  async markConflict(id: string, serverRecord: unknown): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      "UPDATE tasks_local SET conflict = 1, serverSnapshot = ? WHERE id = ?",
      JSON.stringify(serverRecord),
      id,
    );
  },

  async listConflicts(): Promise<LocalTask[]> {
    const db = await getDb();
    return db.getAllAsync<LocalTask>("SELECT * FROM tasks_local WHERE conflict = 1");
  },

  async keepMine(record: LocalTask): Promise<void> {
    const db = await getDb();
    const snapshot = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : null;
    await db.runAsync("UPDATE tasks_local SET conflict = 0, serverSnapshot = NULL WHERE id = ?", record.id);
    await enqueueMutation({
      entity: "task",
      recordId: record.id,
      op: "update",
      baseUpdatedAt: snapshot?.updatedAt ?? new Date().toISOString(),
      data: JSON.stringify({ status: record.status }),
      createdAt: new Date().toISOString(),
    });
  },

  async useServer(record: LocalTask): Promise<void> {
    const snapshot = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : null;
    if (snapshot) {
      await tasksRepo.applyServerRecord(snapshot);
    }
  },
};
