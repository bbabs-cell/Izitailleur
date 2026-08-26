import * as Crypto from "expo-crypto";
import type { CreateOrderDto, OrderStatus, Priority } from "@izitailleur/shared";
import { getDb } from "./db";
import { enqueueMutation } from "./mutationQueue";
import { customersRepo } from "./customersRepo";

export interface LocalOrder {
  id: string;
  reference: string | null;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  modelName: string;
  fabricDescription: string | null;
  price: number;
  deposit: number;
  dueDate: string;
  priority: string;
  status: string;
  instructions: string | null;
  notes: string | null;
  localUpdatedAt: string;
  serverUpdatedAt: string | null;
  dirty: number;
  conflict: number;
  serverSnapshot: string | null;
}

export const ordersRepo = {
  async list(): Promise<LocalOrder[]> {
    const db = await getDb();
    return db.getAllAsync<LocalOrder>(
      "SELECT * FROM orders_local WHERE deletedAt IS NULL ORDER BY dueDate ASC",
    );
  },

  async get(id: string): Promise<LocalOrder | null> {
    const db = await getDb();
    return db.getFirstAsync<LocalOrder>("SELECT * FROM orders_local WHERE id = ?", id);
  },

  /**
   * Création hors connexion : écriture locale immédiate avec un id généré sur l'appareil.
   * La référence (numéro séquentiel) et la vérification/consommation du stock de tissu ne
   * peuvent être calculées qu'au moment de la synchronisation — la référence reste donc "en
   * attente" tant que la commande n'a pas été poussée vers le serveur.
   */
  async create(data: CreateOrderDto): Promise<LocalOrder> {
    const customer = await customersRepo.get(data.customerId);
    if (!customer) {
      throw new Error("Client introuvable localement");
    }

    const db = await getDb();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    const priority: Priority = data.priority ?? "NORMAL";
    const status: OrderStatus = "NEW";

    await db.runAsync(
      `INSERT INTO orders_local
        (id, reference, customerId, customerFirstName, customerLastName, modelName, fabricDescription,
         price, deposit, dueDate, priority, status, instructions, notes,
         localUpdatedAt, serverUpdatedAt, dirty, conflict)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 0)`,
      id,
      data.customerId,
      customer.firstName,
      customer.lastName,
      data.modelName,
      data.fabricDescription ?? null,
      data.price,
      data.deposit ?? 0,
      data.dueDate,
      priority,
      status,
      data.instructions ?? null,
      data.notes ?? null,
      now,
    );

    await enqueueMutation({
      entity: "order",
      recordId: id,
      op: "create",
      baseUpdatedAt: null,
      data: JSON.stringify(data),
      createdAt: now,
    });

    return {
      id,
      reference: null,
      customerId: data.customerId,
      customerFirstName: customer.firstName,
      customerLastName: customer.lastName,
      modelName: data.modelName,
      fabricDescription: data.fabricDescription ?? null,
      price: data.price,
      deposit: data.deposit ?? 0,
      dueDate: data.dueDate,
      priority,
      status,
      instructions: data.instructions ?? null,
      notes: data.notes ?? null,
      localUpdatedAt: now,
      serverUpdatedAt: null,
      dirty: 1,
      conflict: 0,
      serverSnapshot: null,
    };
  },

  /**
   * Changement de statut hors connexion. La validité de la transition est vérifiée par
   * l'appelant (mêmes règles que côté serveur, voir canTransitionOrderStatus) ; la
   * synchronisation revalidera de toute façon la transition au moment de l'application.
   */
  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    const db = await getDb();
    const existing = await ordersRepo.get(id);
    if (!existing) throw new Error("Commande locale introuvable");
    const now = new Date().toISOString();

    await db.runAsync(
      "UPDATE orders_local SET status = ?, localUpdatedAt = ?, dirty = 1 WHERE id = ?",
      status,
      now,
      id,
    );

    await enqueueMutation({
      entity: "order",
      recordId: id,
      op: "update",
      baseUpdatedAt: existing.serverUpdatedAt,
      data: JSON.stringify({ status }),
      createdAt: now,
    });
  },

  async applyServerRecord(record: {
    id: string;
    reference: string;
    customerId: string;
    customer: { firstName: string; lastName: string };
    modelName: string;
    fabricDescription: string | null;
    price: number;
    deposit: number;
    dueDate: string;
    priority: string;
    status: string;
    instructions: string | null;
    notes: string | null;
    updatedAt: string;
    deletedAt: string | null;
  }): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO orders_local
        (id, reference, customerId, customerFirstName, customerLastName, modelName, fabricDescription,
         price, deposit, dueDate, priority, status, instructions, notes,
         localUpdatedAt, serverUpdatedAt, deletedAt, dirty, conflict, serverSnapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL)
       ON CONFLICT(id) DO UPDATE SET
        reference = excluded.reference, customerId = excluded.customerId,
        customerFirstName = excluded.customerFirstName, customerLastName = excluded.customerLastName,
        modelName = excluded.modelName, fabricDescription = excluded.fabricDescription,
        price = excluded.price, deposit = excluded.deposit, dueDate = excluded.dueDate,
        priority = excluded.priority, status = excluded.status, instructions = excluded.instructions,
        notes = excluded.notes, localUpdatedAt = excluded.localUpdatedAt,
        serverUpdatedAt = excluded.serverUpdatedAt, deletedAt = excluded.deletedAt,
        dirty = 0, conflict = 0, serverSnapshot = NULL`,
      record.id,
      record.reference,
      record.customerId,
      record.customer.firstName,
      record.customer.lastName,
      record.modelName,
      record.fabricDescription,
      record.price,
      record.deposit,
      record.dueDate,
      record.priority,
      record.status,
      record.instructions,
      record.notes,
      record.updatedAt,
      record.updatedAt,
      record.deletedAt,
    );
  },

  async markConflict(id: string, serverRecord: unknown): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      "UPDATE orders_local SET conflict = 1, serverSnapshot = ? WHERE id = ?",
      JSON.stringify(serverRecord),
      id,
    );
  },

  async listConflicts(): Promise<LocalOrder[]> {
    const db = await getDb();
    return db.getAllAsync<LocalOrder>("SELECT * FROM orders_local WHERE conflict = 1");
  },

  /**
   * Un conflit sur une commande ne peut se produire que sur un changement de statut (aucune
   * édition de champ n'existe). "Garder la mienne" retente donc simplement le même statut
   * contre la base la plus récente.
   */
  async keepMine(record: LocalOrder): Promise<void> {
    const db = await getDb();
    const snapshot = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : null;
    await db.runAsync("UPDATE orders_local SET conflict = 0, serverSnapshot = NULL WHERE id = ?", record.id);
    await enqueueMutation({
      entity: "order",
      recordId: record.id,
      op: "update",
      baseUpdatedAt: snapshot?.updatedAt ?? new Date().toISOString(),
      data: JSON.stringify({ status: record.status as OrderStatus }),
      createdAt: new Date().toISOString(),
    });
  },

  async useServer(record: LocalOrder): Promise<void> {
    const snapshot = record.serverSnapshot ? JSON.parse(record.serverSnapshot) : null;
    if (snapshot) {
      await ordersRepo.applyServerRecord(snapshot);
    }
  },
};
