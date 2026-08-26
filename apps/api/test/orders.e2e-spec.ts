import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Orders (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let customerId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: token } = await registerWorkshop(app, "+221796"));

    const customerRes = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Ibrahima", lastName: "Sow" })
      .expect(201);
    customerId = customerRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it("refuse une commande pour un client inexistant", async () => {
    await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: "00000000-0000-0000-0000-000000000000",
        modelName: "Boubou homme",
        price: 15000,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(400);
  });

  let orderId: string;

  it("crée une commande avec une référence auto-générée", async () => {
    const res = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId,
        modelName: "Boubou homme",
        fabricDescription: "Bazin bleu",
        price: 15000,
        deposit: 5000,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    expect(res.body.reference).toBe("0001");
    orderId = res.body.id;
  });

  it("incrémente la référence pour la commande suivante", async () => {
    const res = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId,
        modelName: "Robe",
        price: 20000,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    expect(res.body.reference).toBe("0002");
  });

  it("refuse une transition de statut invalide", async () => {
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "DELIVERED" })
      .expect(400);
  });

  it("accepte une transition de statut valide et conserve l'historique", async () => {
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "CUTTING" })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.status).toBe("CUTTING");
    expect(res.body.statusHistory).toHaveLength(2);
    expect(res.body.statusHistory[1].toStatus).toBe("CUTTING");
  });

  it("ajoute une tâche à une commande et fait évoluer son statut", async () => {
    const taskRes = await request(app.getHttpServer())
      .post(`/orders/${orderId}/tasks`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Faire le col selon le modèle" })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/tasks/${taskRes.body.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "DONE" })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.tasks[0].status).toBe("DONE");
  });

  it("ajoute une photo à une commande", async () => {
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/images`)
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://example.com/photo.jpg" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.images).toHaveLength(1);
  });

  it("filtre les commandes par statut", async () => {
    const res = await request(app.getHttpServer())
      .get("/orders?status=CUTTING")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.every((o: { status: string }) => o.status === "CUTTING")).toBe(true);
  });
});
