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

  it("génère une vraie facture PDF récapitulant toute la commande", async () => {
    const res = await request(app.getHttpServer())
      .get(`/orders/${orderId}/invoice/pdf`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.body.slice(0, 5).toString()).toBe("%PDF-");
    expect(res.body.length).toBeGreaterThan(500);
  });

  it("refuse la facture d'une commande d'un autre atelier", async () => {
    const { accessToken: otherToken } = await registerWorkshop(app, "+221791");
    await request(app.getHttpServer())
      .get(`/orders/${orderId}/invoice/pdf`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(404);
  });

  it("exporte les paiements réels en CSV", async () => {
    const res = await request(app.getHttpServer())
      .get("/finance/export.csv")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Date,Commande,Client,Montant (FCFA),Mode,Enregistré par");
    expect(res.text).toContain("Ousmane Ndoye");
    expect(res.text).toContain("15000");
  });

  it("filtre l'export CSV par plage de dates", async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const res = await request(app.getHttpServer())
      .get(`/finance/export.csv?from=${encodeURIComponent(future)}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    const lines = res.text.trim().split("\r\n");
    expect(lines).toHaveLength(1); // en-tête uniquement, aucun paiement après cette date
  });

  it("refuse une plage de dates invalide pour l'export CSV", async () => {
    await request(app.getHttpServer())
      .get("/finance/export.csv?from=not-a-date")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(400);
  });

  it("personnalise le pied de page des reçus/factures via les paramètres de l'atelier", async () => {
    await request(app.getHttpServer())
      .patch("/workshop")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ receiptFooterMessage: "Garantie trente jours ouvres" })
      .expect(200);

    const settings = await request(app.getHttpServer())
      .get("/workshop")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    expect(settings.body.receiptFooterMessage).toBe("Garantie trente jours ouvres");

    const receiptPdf = await request(app.getHttpServer())
      .get(`/receipts/${receiptId}/pdf`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    // PDFKit encode le texte en chaînes hexadécimales (découpées par le crénage) plutôt qu'en
    // texte littéral : on décode chaque fragment <...> et on les concatène pour vérifier que le
    // message personnalisé apparaît bien dans le contenu réel du PDF généré.
    const raw = receiptPdf.body.toString("latin1");
    const decodedText = [...raw.matchAll(/<([0-9a-fA-F]+)>/g)]
      .map((m) => Buffer.from(m[1], "hex").toString("latin1"))
      .join("");
    expect(decodedText).toContain("Garantie trente jours ouvres");
  });

  it("refuse la modification des paramètres de l'atelier à un rôle non autorisé", async () => {
    const apprenticePhone = `+22179998${Date.now().toString().slice(-4)}`;
    await request(app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ fullName: "Apprenti Réglages", phone: apprenticePhone, password: "demo12345", role: "APPRENTICE" })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ phone: apprenticePhone, password: "demo12345" })
      .expect(200);

    await request(app.getHttpServer())
      .patch("/workshop")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .send({ name: "Piraté" })
      .expect(403);
  });
});
