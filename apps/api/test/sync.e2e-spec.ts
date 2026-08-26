import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Sync (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: token } = await registerWorkshop(app, "+221789"));
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it("pull renvoie une liste vide juste après l'inscription (rien de nouveau)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/sync/pull?since=${new Date().toISOString()}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.customers).toHaveLength(0);
  });

  it("refuse un paramètre 'since' invalide", async () => {
    await request(app.getHttpServer())
      .get("/sync/pull?since=not-a-date")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  const customerId = randomUUID();

  it("push crée un client hors-ligne avec un id généré côté client", async () => {
    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          {
            op: "create",
            entity: "customer",
            id: customerId,
            data: { firstName: "Aïda", lastName: "Diop", phone: "+221701234567" },
          },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("applied");
    expect(res.body[0].serverRecord.id).toBe(customerId);
  });

  it("le push du même id (rejeu) est idempotent, pas d'erreur ni de doublon", async () => {
    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          {
            op: "create",
            entity: "customer",
            id: customerId,
            data: { firstName: "Aïda", lastName: "Diop", phone: "+221701234567" },
          },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("applied");

    const count = await prisma.customer.count({ where: { id: customerId } });
    expect(count).toBe(1);
  });

  it("pull renvoie le client créé hors-ligne", async () => {
    const res = await request(app.getHttpServer())
      .get(`/sync/pull?since=${new Date(0).toISOString()}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.customers.some((c: { id: string }) => c.id === customerId)).toBe(true);
  });

  it("détecte un vrai conflit : deux appareils modifient le même client sans se resynchroniser", async () => {
    const baseUpdatedAt = (
      await request(app.getHttpServer())
        .get(`/sync/pull?since=${new Date(0).toISOString()}`)
        .set("Authorization", `Bearer ${token}`)
    ).body.customers.find((c: { id: string }) => c.id === customerId).updatedAt;

    // Appareil A pousse une modification en premier.
    await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          { op: "update", entity: "customer", id: customerId, baseUpdatedAt, data: { notes: "Modifié par A" } },
        ],
      })
      .expect(201);

    // Appareil B, resté hors-ligne plus longtemps, pousse une modification basée sur l'ancienne version.
    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          { op: "update", entity: "customer", id: customerId, baseUpdatedAt, data: { notes: "Modifié par B" } },
        ],
      })
      .expect(201);

    expect(res.body[0].status).toBe("conflict");
    expect(res.body[0].serverRecord.notes).toBe("Modifié par A");

    const current = await prisma.customer.findUnique({ where: { id: customerId } });
    expect(current?.notes).toBe("Modifié par A");
  });

  it("signale 'not_found' pour une mise à jour sur un id inexistant", async () => {
    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          {
            op: "update",
            entity: "customer",
            id: randomUUID(),
            baseUpdatedAt: new Date().toISOString(),
            data: { notes: "x" },
          },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("not_found");
  });

  it("refuse des données invalides avec un statut 'error' explicite", async () => {
    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [{ op: "create", entity: "customer", id: randomUUID(), data: { firstName: "" } }],
      })
      .expect(201);
    expect(res.body[0].status).toBe("error");
  });

  it("synchronise aussi les rendez-vous (calendrier)", async () => {
    const appointmentId = randomUUID();
    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          {
            op: "create",
            entity: "appointment",
            id: appointmentId,
            data: {
              type: "FITTING",
              title: "Essayage hors-ligne",
              startAt: new Date(Date.now() + 86400000).toISOString(),
            },
          },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("applied");

    const pull = await request(app.getHttpServer())
      .get(`/sync/pull?since=${new Date(0).toISOString()}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(pull.body.appointments.some((a: { id: string }) => a.id === appointmentId)).toBe(true);
  });

  let syncCustomerId: string;
  let syncOrderId: string;

  it("synchronise la création d'une commande hors-ligne (référence générée côté serveur)", async () => {
    const customerRes = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Fatou", lastName: "Ndiaye" })
      .expect(201);
    syncCustomerId = customerRes.body.id;
    syncOrderId = randomUUID();

    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          {
            op: "create",
            entity: "order",
            id: syncOrderId,
            data: {
              customerId: syncCustomerId,
              modelName: "Boubou hors-ligne",
              price: 25000,
              dueDate: new Date(Date.now() + 86400000).toISOString(),
            },
          },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("applied");
    expect(res.body[0].serverRecord.id).toBe(syncOrderId);
    expect(res.body[0].serverRecord.reference).toMatch(/^\d{4}$/);

    const pull = await request(app.getHttpServer())
      .get(`/sync/pull?since=${new Date(0).toISOString()}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(pull.body.orders.some((o: { id: string }) => o.id === syncOrderId)).toBe(true);
  });

  it("le rejeu de la même création de commande est idempotent", async () => {
    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          {
            op: "create",
            entity: "order",
            id: syncOrderId,
            data: {
              customerId: syncCustomerId,
              modelName: "Boubou hors-ligne",
              price: 25000,
              dueDate: new Date(Date.now() + 86400000).toISOString(),
            },
          },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("applied");
    const count = await prisma.order.count({ where: { id: syncOrderId } });
    expect(count).toBe(1);
  });

  it("synchronise un changement de statut de commande hors-ligne", async () => {
    const baseUpdatedAt = (await prisma.order.findUniqueOrThrow({ where: { id: syncOrderId } })).updatedAt.toISOString();

    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          { op: "update", entity: "order", id: syncOrderId, baseUpdatedAt, data: { status: "PENDING" } },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("applied");
    expect(res.body[0].serverRecord.status).toBe("PENDING");
  });

  it("refuse une transition de statut invalide avec un statut 'error'", async () => {
    const baseUpdatedAt = (await prisma.order.findUniqueOrThrow({ where: { id: syncOrderId } })).updatedAt.toISOString();

    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          { op: "update", entity: "order", id: syncOrderId, baseUpdatedAt, data: { status: "DELIVERED" } },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("error");
  });

  it("refuse la suppression de commande (opération inexistante)", async () => {
    const baseUpdatedAt = (await prisma.order.findUniqueOrThrow({ where: { id: syncOrderId } })).updatedAt.toISOString();
    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({ mutations: [{ op: "delete", entity: "order", id: syncOrderId, baseUpdatedAt }] })
      .expect(201);
    expect(res.body[0].status).toBe("error");
  });

  let syncTaskId: string;

  it("synchronise la création d'une tâche hors-ligne rattachée à la commande", async () => {
    syncTaskId = randomUUID();
    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          {
            op: "create",
            entity: "task",
            id: syncTaskId,
            data: { orderId: syncOrderId, title: "Coudre le col" },
          },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("applied");
    expect(res.body[0].serverRecord.id).toBe(syncTaskId);

    const pull = await request(app.getHttpServer())
      .get(`/sync/pull?since=${new Date(0).toISOString()}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(pull.body.tasks.some((t: { id: string }) => t.id === syncTaskId)).toBe(true);
  });

  it("synchronise un changement de statut de tâche hors-ligne", async () => {
    const baseUpdatedAt = (await prisma.orderTask.findUniqueOrThrow({ where: { id: syncTaskId } })).updatedAt.toISOString();

    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          { op: "update", entity: "task", id: syncTaskId, baseUpdatedAt, data: { status: "DONE" } },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("applied");
    expect(res.body[0].serverRecord.status).toBe("DONE");
  });

  it("détecte un conflit sur une commande modifiée par deux appareils hors-ligne", async () => {
    const baseUpdatedAt = (await prisma.order.findUniqueOrThrow({ where: { id: syncOrderId } })).updatedAt.toISOString();

    await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          { op: "update", entity: "order", id: syncOrderId, baseUpdatedAt, data: { status: "CUTTING" } },
        ],
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post("/sync/push")
      .set("Authorization", `Bearer ${token}`)
      .send({
        mutations: [
          { op: "update", entity: "order", id: syncOrderId, baseUpdatedAt, data: { status: "SEWING" } },
        ],
      })
      .expect(201);
    expect(res.body[0].status).toBe("conflict");
  });
});
