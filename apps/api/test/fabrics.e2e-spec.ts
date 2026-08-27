import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Fabrics (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: token } = await registerWorkshop(app, "+221793"));
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  let fabricId: string;

  it("crée un tissu avec un stock initial", async () => {
    const res = await request(app.getHttpServer())
      .post("/fabrics")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bazin bleu", quantity: 12, unit: "m" })
      .expect(201);
    fabricId = res.body.id;
    expect(res.body.quantity).toBe(12);
  });

  it("enregistre une sortie de stock (consommation) et met à jour la quantité", async () => {
    const res = await request(app.getHttpServer())
      .post(`/fabrics/${fabricId}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "OUT", quantity: 4 })
      .expect(201);
    expect(res.body.quantity).toBe(8);
  });

  it("refuse une sortie de stock supérieure au disponible (tissu insuffisant)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/fabrics/${fabricId}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "OUT", quantity: 10 })
      .expect(400);
    expect(res.body.message).toMatch(/insuffisant/i);
  });

  it("enregistre une entrée de stock (réapprovisionnement)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/fabrics/${fabricId}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "IN", quantity: 20 })
      .expect(201);
    expect(res.body.quantity).toBe(28);
  });

  it("liste les tissus en stock faible", async () => {
    await request(app.getHttpServer())
      .post("/fabrics")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Wax rouge", quantity: 2 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get("/fabrics/low-stock")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.some((f: { name: string }) => f.name === "Wax rouge")).toBe(true);
  });

  it("empêche la création d'une commande si le tissu est insuffisant", async () => {
    const customerRes = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Aïssata", lastName: "Bâ" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customerRes.body.id,
        modelName: "Boubou",
        price: 20000,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        fabricId,
        fabricQuantity: 100,
      })
      .expect(400);
    expect(res.body.message).toMatch(/insuffisant/i);
  });

  it("consomme le tissu automatiquement à la création d'une commande valide", async () => {
    const customerRes = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Ousmane", lastName: "Fall" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId: customerRes.body.id,
        modelName: "Robe",
        price: 15000,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        fabricId,
        fabricQuantity: 5,
      })
      .expect(201);

    const fabricRes = await request(app.getHttpServer())
      .get(`/fabrics/${fabricId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(fabricRes.body.quantity).toBe(23);
    expect(fabricRes.body.movements.some((m: { orderId: string | null }) => m.orderId)).toBe(true);
  });

  it("masque le prix d'achat pour un apprenti", async () => {
    await request(app.getHttpServer())
      .post(`/fabrics/${fabricId}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "IN", quantity: 1 })
      .expect(201);

    const priced = await request(app.getHttpServer())
      .post("/fabrics")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Wax premium", quantity: 5, purchasePrice: 3000 })
      .expect(201);
    expect(priced.body.purchasePrice).toBe(3000);

    const apprenticePhone = `+22179995${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;
    await request(app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({ fullName: "Apprenti Tissu", phone: apprenticePhone, password: "demo12345", role: "APPRENTICE" })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ phone: apprenticePhone, password: "demo12345" })
      .expect(200);
    const apprenticeToken = login.body.accessToken;

    const list = await request(app.getHttpServer())
      .get("/fabrics")
      .set("Authorization", `Bearer ${apprenticeToken}`)
      .expect(200);
    expect(list.body.length).toBeGreaterThan(0);
    expect(list.body.every((f: { purchasePrice: number | null }) => f.purchasePrice === null)).toBe(true);

    const detail = await request(app.getHttpServer())
      .get(`/fabrics/${priced.body.id}`)
      .set("Authorization", `Bearer ${apprenticeToken}`)
      .expect(200);
    expect(detail.body.purchasePrice).toBeNull();

    const lowStock = await request(app.getHttpServer())
      .get("/fabrics/low-stock")
      .set("Authorization", `Bearer ${apprenticeToken}`)
      .expect(200);
    expect(lowStock.body.every((f: { purchasePrice: number | null }) => f.purchasePrice === null)).toBe(true);

    const movement = await request(app.getHttpServer())
      .post(`/fabrics/${priced.body.id}/movements`)
      .set("Authorization", `Bearer ${apprenticeToken}`)
      .send({ type: "IN", quantity: 1 })
      .expect(201);
    expect(movement.body.purchasePrice).toBeNull();
  });
});
