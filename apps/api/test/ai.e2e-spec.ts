import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("AI (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let customerId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: ownerToken } = await registerWorkshop(app, "+221787"));

    const customerRes = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ firstName: "Khady", lastName: "Sarr" })
      .expect(201);
    customerId = customerRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  function ask(question: string, token = ownerToken) {
    return request(app.getHttpServer())
      .post("/ai/ask")
      .set("Authorization", `Bearer ${token}`)
      .send({ question });
  }

  it("répond à « Qu'est-ce que je dois faire aujourd'hui ? »", async () => {
    const res = await ask("Qu'est-ce que je dois faire aujourd'hui ?").expect(201);
    expect(res.body.intent).toBe("TODAY");
    expect(typeof res.body.answer).toBe("string");
  });

  it("répond « aucune commande en retard » quand c'est vrai", async () => {
    const res = await ask("Quelles commandes sont en retard ?").expect(201);
    expect(res.body.intent).toBe("LATE_ORDERS");
    expect(res.body.answer).toMatch(/aucune/i);
  });

  let orderReference: string;

  it("détecte une commande en retard après en avoir créé une", async () => {
    const orderRes = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        customerId,
        modelName: "Robe",
        price: 15000,
        dueDate: new Date(Date.now() - 86400000).toISOString(),
      })
      .expect(201);
    orderReference = orderRes.body.reference;

    const res = await ask("Quelles sont les commandes en retard ?").expect(201);
    expect(res.body.answer).toContain(`#${orderReference}`);
  });

  it("explique pourquoi une commande est en retard (aucun problème signalé)", async () => {
    const res = await ask("Pourquoi mes commandes sont-elles en retard ?").expect(201);
    expect(res.body.intent).toBe("LATE_REASONS");
    expect(res.body.answer).toContain("aucun problème signalé");
  });

  it("explique le retard avec la vraie raison quand un problème est lié", async () => {
    const orderList = await request(app.getHttpServer())
      .get("/orders")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    const lateOrder = orderList.body.find((o: { reference: string }) => o.reference === orderReference);

    await request(app.getHttpServer())
      .post("/issues")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ title: "Tissu défectueux", category: "DEFECTIVE_FABRIC", orderId: lateOrder.id })
      .expect(201);

    const res = await ask("Pourquoi mes commandes sont-elles en retard ?").expect(201);
    expect(res.body.answer).toContain("Tissu défectueux");
  });

  it("répond à « Qui travaille sur la commande #XXXX ? »", async () => {
    const res = await ask(`Qui travaille sur la commande #${orderReference} ?`).expect(201);
    expect(res.body.intent).toBe("ORDER_ASSIGNEE");
    expect(res.body.answer).toMatch(/personne n'est assigné/i);
  });

  it("signale une commande introuvable plutôt que d'inventer une réponse", async () => {
    const res = await ask("Qui travaille sur la commande #9999 ?").expect(201);
    expect(res.body.answer).toMatch(/introuvable/i);
  });

  it("répond à « Qui me doit de l'argent ? » pour un rôle autorisé", async () => {
    const res = await ask("Qui me doit de l'argent ?").expect(201);
    expect(res.body.intent).toBe("DEBTS");
    expect(res.body.answer).toContain("Khady Sarr");
  });

  it("refuse de répondre aux questions financières pour un rôle non autorisé", async () => {
    const apprenticePhone = `+22179996${Date.now().toString().slice(-4)}`;
    await request(app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ fullName: "Apprenti IA", phone: apprenticePhone, password: "demo12345", role: "APPRENTICE" })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ phone: apprenticePhone, password: "demo12345" })
      .expect(200);

    const res = await ask("Qui me doit de l'argent ?", login.body.accessToken).expect(201);
    expect(res.body.data).toBeNull();
    expect(res.body.answer).toMatch(/pas accès/i);
  });

  it("répond à « Quel tissu va bientôt manquer ? »", async () => {
    await request(app.getHttpServer())
      .post("/fabrics")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Bazin en voie d'épuisement", quantity: 1 })
      .expect(201);

    const res = await ask("Quel tissu va bientôt manquer ?").expect(201);
    expect(res.body.intent).toBe("LOW_STOCK");
    expect(res.body.answer).toContain("Bazin en voie d'épuisement");
  });

  it("ne prétend jamais comprendre une question hors périmètre", async () => {
    const res = await ask("Quelle est la météo à Dakar ?").expect(201);
    expect(res.body.intent).toBe("UNKNOWN");
    expect(res.body.data).toBeNull();
  });
});
