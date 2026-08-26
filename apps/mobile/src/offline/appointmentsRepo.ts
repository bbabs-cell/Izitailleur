import * as Crypto from "expo-crypto";
import type { CreateAppointmentDto } from "@izitailleur/shared";
import { getDb } from "./db";
import { enqueueMutation } from "./mutationQueue";
import type { AppointmentType } from "@izitailleur/shared";
import { scheduleAppointmentReminder } from "../notifications/localNotifications";

export interface LocalAppointment {
  id: string;
  customerId: string | null;
  orderId: string | null;
  type: string;
  title: string;
  startAt: string;
  endAt: string | null;
  notes: string | null;
  localUpdatedAt: string;
  serverUpdatedAt: string | null;
  dirty: number;
  conflict: number;
  serverSnapshot: string | null;
}

export const appointmentsRepo = {
  async listInRange(fromIso: string, toIso: string): Promise<LocalAppointment[]> {
    const db = await getDb();
    return db.getAllAsync<LocalAppointment>(
      "SELECT * FROM appointments_local WHERE deletedAt IS NULL AND startAt >= ? AND startAt <= ? ORDER BY startAt ASC",
      fromIso,
      toIso,
    );
  },

  async create(data: CreateAppointmentDto): Promise<LocalAppointment> {
    const db = await getDb();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO appointments_local
        (id, customerId, orderId, type, title, startAt, endAt, notes, localUpdatedAt, serverUpdatedAt, dirty, conflict)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 0)`,
      id,
      data.customerId ?? null,
      data.orderId ?? null,
      data.type,
      data.title,
      data.startAt,
      data.endAt ?? null,
      data.notes ?? null,
      now,
    );

    await enqueueMutation({
      entity: "appointment",
      recordId: id,
      op: "create",
      baseUpdatedAt: null,
      data: JSON.stringify(data),
      createdAt: now,
    });

    // Rappel local sur l'appareil (best-effort) : fonctionne même hors connexion, sans
    // dépendre d'un serveur de push. Échec silencieux si la permission est refusée.
    scheduleAppointmentReminder(id, data.title, data.startAt).catch(() => undefined);

    return {
      id,
      customerId: data.customerId ?? null,
      orderId: data.orderId ?? null,
      type: data.type,
      title: data.title,
      startAt: data.startAt,
      endAt: data.endAt ?? null,
      notes: data.notes ?? null,
      localUpdatedAt: now,
      serverUpdatedAt: null,
      dirty: 1,
      conflict: 0,
      serverSnapshot: null,
    };
  },

  async applyServerRecord(record: {
    id: string;
    customerId: string | null;
    orderId: string | null;
    type: string;
    title: string;
    startAt: string;
    endAt: string | null;
    notes: string | null;
    updatedAt: string;
    deletedAt: string | null;
  }): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO appointments_local
        (id, customerId, orderId, type, title, startAt, endAt, notes, localUpdatedAt, serverUpdatedAt, deletedAt, dirty, conflict, serverSnapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL)
       ON CONFLICT(id) DO UPDATE SET
        customerId = excluded.customerId, orderId = excluded.orderId, type = excluded.type,
        title = excluded.title, startAt = excluded.startAt, endAt = excluded.endAt, notes = excluded.notes,
        localUpdatedAt = excluded.localUpdatedAt, serverUpdatedAt = excluded.serverUpdatedAt,
        deletedAt = excluded.deletedAt, dirty = 0, conflict = 0, serverSnapshot = NULL`,
      record.id,
      record.customerId,
      record.orderId,
      record.type,
      record.title,
      record.startAt,
      record.endAt,
      record.notes,
      record.updatedAt,
      record.updatedAt,
      record.deletedAt,
    );
  },

  async clearDirtyAfterApplied(id: string, serverUpdatedAt: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      "UPDATE appointments_local SET dirty = 0, conflict = 0, serverSnapshot = NULL, serverUpdatedAt = ? WHERE id = ?",
      serverUpdatedAt,
      id,
    );
  },

  async markConflict(id: string, serverRecord: unknown): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      "UPDATE appointments_local SET conflict = 1, serverSnapshot = ? WHERE id = ?",
      JSON.stringify(serverRecord),
      id,
    );
  },

  async listConflicts(): Promise<LocalAppointment[]> {
    const db = await getDb();
    return db.getAllAsync<LocalAppointment>("SELECT * FROM appointments_local WHERE conflict = 1");
  },

  async keepMine(record: LocalAppointment): Promise<void> {
    const db = await getDb();
    const snapshot = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : null;
    await db.runAsync(
      "UPDATE appointments_local SET conflict = 0, serverSnapshot = NULL WHERE id = ?",
      record.id,
    );
    await enqueueMutation({
      entity: "appointment",
      recordId: record.id,
      op: "update",
      baseUpdatedAt: snapshot?.updatedAt ?? new Date().toISOString(),
      data: JSON.stringify({
        customerId: record.customerId,
        orderId: record.orderId,
        type: record.type as AppointmentType,
        title: record.title,
        startAt: record.startAt,
        endAt: record.endAt,
        notes: record.notes,
      }),
      createdAt: new Date().toISOString(),
    });
  },

  async useServer(record: LocalAppointment): Promise<void> {
    const snapshot = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : null;
    if (snapshot) {
      await appointmentsRepo.applyServerRecord(snapshot);
    }
  },
};
