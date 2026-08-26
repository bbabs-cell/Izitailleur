import * as Crypto from "expo-crypto";
import type { CustomerDto } from "@izitailleur/shared";
import { getDb } from "./db";
import { enqueueMutation } from "./mutationQueue";

export interface LocalCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  localUpdatedAt: string;
  serverUpdatedAt: string | null;
  dirty: number;
  conflict: number;
  serverSnapshot: string | null;
}

export const customersRepo = {
  async list(): Promise<LocalCustomer[]> {
    const db = await getDb();
    return db.getAllAsync<LocalCustomer>(
      "SELECT * FROM customers_local WHERE deletedAt IS NULL ORDER BY localUpdatedAt DESC",
    );
  },

  async get(id: string): Promise<LocalCustomer | null> {
    const db = await getDb();
    return db.getFirstAsync<LocalCustomer>("SELECT * FROM customers_local WHERE id = ?", id);
  },

  async create(data: CustomerDto): Promise<LocalCustomer> {
    const db = await getDb();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO customers_local
        (id, firstName, lastName, phone, whatsapp, address, notes, localUpdatedAt, serverUpdatedAt, dirty, conflict)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 0)`,
      id,
      data.firstName,
      data.lastName,
      data.phone ?? null,
      data.whatsapp ?? null,
      data.address ?? null,
      data.notes ?? null,
      now,
    );

    await enqueueMutation({
      entity: "customer",
      recordId: id,
      op: "create",
      baseUpdatedAt: null,
      data: JSON.stringify(data),
      createdAt: now,
    });

    return { id, ...data, phone: data.phone ?? null, whatsapp: data.whatsapp ?? null, address: data.address ?? null, notes: data.notes ?? null, localUpdatedAt: now, serverUpdatedAt: null, dirty: 1, conflict: 0, serverSnapshot: null };
  },

  async update(id: string, data: Partial<CustomerDto>): Promise<void> {
    const db = await getDb();
    const existing = await customersRepo.get(id);
    if (!existing) throw new Error("Client local introuvable");
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE customers_local SET
        firstName = COALESCE(?, firstName), lastName = COALESCE(?, lastName),
        phone = ?, whatsapp = ?, address = ?, notes = ?,
        localUpdatedAt = ?, dirty = 1
       WHERE id = ?`,
      data.firstName ?? null,
      data.lastName ?? null,
      data.phone ?? existing.phone,
      data.whatsapp ?? existing.whatsapp,
      data.address ?? existing.address,
      data.notes ?? existing.notes,
      now,
      id,
    );

    await enqueueMutation({
      entity: "customer",
      recordId: id,
      op: "update",
      baseUpdatedAt: existing.serverUpdatedAt,
      data: JSON.stringify(data),
      createdAt: now,
    });
  },

  /** Applique la version envoyée par le serveur (après pull, ou choix "utiliser le serveur"). */
  async applyServerRecord(record: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    notes: string | null;
    updatedAt: string;
    deletedAt: string | null;
  }): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO customers_local
        (id, firstName, lastName, phone, whatsapp, address, notes, localUpdatedAt, serverUpdatedAt, deletedAt, dirty, conflict, serverSnapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL)
       ON CONFLICT(id) DO UPDATE SET
        firstName = excluded.firstName, lastName = excluded.lastName, phone = excluded.phone,
        whatsapp = excluded.whatsapp, address = excluded.address, notes = excluded.notes,
        localUpdatedAt = excluded.localUpdatedAt, serverUpdatedAt = excluded.serverUpdatedAt,
        deletedAt = excluded.deletedAt, dirty = 0, conflict = 0, serverSnapshot = NULL`,
      record.id,
      record.firstName,
      record.lastName,
      record.phone,
      record.whatsapp,
      record.address,
      record.notes,
      record.updatedAt,
      record.updatedAt,
      record.deletedAt,
    );
  },

  async markConflict(id: string, serverRecord: unknown): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      "UPDATE customers_local SET conflict = 1, serverSnapshot = ? WHERE id = ?",
      JSON.stringify(serverRecord),
      id,
    );
  },

  async clearDirtyAfterApplied(id: string, serverUpdatedAt: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      "UPDATE customers_local SET dirty = 0, conflict = 0, serverSnapshot = NULL, serverUpdatedAt = ? WHERE id = ?",
      serverUpdatedAt,
      id,
    );
  },

  async listConflicts(): Promise<LocalCustomer[]> {
    const db = await getDb();
    return db.getAllAsync<LocalCustomer>("SELECT * FROM customers_local WHERE conflict = 1");
  },

  /** L'utilisateur choisit de garder sa version locale : on la repousse avec la nouvelle base. */
  async keepMine(record: LocalCustomer): Promise<void> {
    const db = await getDb();
    const snapshot = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : null;
    await db.runAsync("UPDATE customers_local SET conflict = 0, serverSnapshot = NULL WHERE id = ?", record.id);
    await enqueueMutation({
      entity: "customer",
      recordId: record.id,
      op: "update",
      baseUpdatedAt: snapshot?.updatedAt ?? new Date().toISOString(),
      data: JSON.stringify({
        firstName: record.firstName,
        lastName: record.lastName,
        phone: record.phone,
        whatsapp: record.whatsapp,
        address: record.address,
        notes: record.notes,
      }),
      createdAt: new Date().toISOString(),
    });
  },

  /** L'utilisateur choisit d'écraser sa version locale par celle du serveur. */
  async useServer(record: LocalCustomer): Promise<void> {
    const snapshot = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : null;
    if (snapshot) {
      await customersRepo.applyServerRecord(snapshot);
    }
  },
};
