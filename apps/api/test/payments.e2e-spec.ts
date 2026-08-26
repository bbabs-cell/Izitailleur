import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Payments & Finance (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let orderId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: ownerToken } = await registerWorkshop(app, "+221790"));

    const customerRes = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ firstName: "Ousmane", lastName: "Ndoye" })
      .expect(201);

    const orderRes = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        customerId: customerRes.body.id,
        modelName: "Costume",
        price: 30000,
        deposit: 10000,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    orderId = orderRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it("calcule correctement le solde initial (prix - acompte)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}/payments`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.totalPaid).toBe(10000);
    expect(res.body.balance).toBe(20000);
  });

  it("refuse un paiement supérieur au solde restant", async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/payments`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ amount: 25000, method: "CASH" })
      .expect(400);
    expect(res.body.message).toMatch(/dépasse/i);
  });

  let receiptId: string;

  it("enregistre un paiement valide et génère un reçu", async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/payments`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ amount: 15000, method: "WAVE" })
      .expect(201);
    expect(res.body.receipt.number).toMatch(/^R-\d{5}$/);
    receiptId = res.body.receipt.id;
  });

  it("met à jour le solde après le paiement", async () => {
    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}/payments`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.totalPaid).toBe(25000);
    expect(res.body.balance).toBe(5000);
  });

  it("refuse un second paiement qui dépasserait maintenant le solde restant de 5000", async () => {
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/payments`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ amount: 5001, method: "CASH" })
      .expect(400);
  });

  it("récupère le reçu au format JSON", async () => {
    const res = await request(app.getHttpServer())
      .get(`/receipts/${receiptId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.amount).toBe(15000);
    expect(res.body.order.customer.firstName).toBe("Ousmane");
  });

  it("génère un vrai PDF pour le reçu", async () => {
    const res = await request(app.getHttpServer())
      .get(`/receipts/${receiptId}/pdf`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.body.length).toBeGreaterThan(500);
    expect(res.body.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("apparaît dans la vue 'argent à récupérer' tant qu'il reste un solde", async () => {
    const res = await request(app.getHttpServer())
      .get("/finance/debts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    const entry = res.body.find((d: { orderId: string }) => d.orderId === orderId);
    expect(entry).toBeDefined();
    expect(entry.remaining).toBe(5000);
  });

  it("expose des statistiques basées sur les données réelles", async () => {
    const res = await request(app.getHttpServer())
      .get("/finance/stats")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.ordersCount).toBeGreaterThanOrEqual(1);
    expect(res.body.revenue).toBeGreaterThanOrEqual(25000);
    expect(res.body.unpaid).toBeGreaterThanOrEqual(5000);
  });

  it("refuse l'accès aux finances à un rôle sans permission (apprenti)", async () => {
    const apprenticePhone = `+22179999${Date.now().toString().slice(-4)}`;
    await request(app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ fullName: "Apprenti Test", phone: apprenticePhone, password: "demo12345", role: "APPRENTICE" })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ phone: apprenticePhone, password: "demo12345" })
      .expect(200);

    await request(app.getHttpServer())
      .get("/finance/stats")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/orders/${orderId}/payments`)
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(403);
  });
});
