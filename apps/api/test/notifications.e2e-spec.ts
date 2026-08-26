import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Notifications (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let customerId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: token } = await registerWorkshop(app, "+221788"));

    const customerRes = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Modou", lastName: "Fall" })
      .expect(201);
    customerId = customerRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it("génère une alerte de rendez-vous imminent lors du scan", async () => {
    await request(app.getHttpServer())
      .post("/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "FITTING",
        title: "Essayage imminent",
        customerId,
        startAt: new Date(Date.now() + 30 * 60000).toISOString(),
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post("/notifications/scan")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(res.body.some((n: { type: string }) => n.type === "APPOINTMENT")).toBe(true);
  });

  it("ne génère pas de doublon au second scan (unicité type+entité)", async () => {
    const before = await request(app.getHttpServer())
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const countBefore = before.body.filter((n: { type: string }) => n.type === "APPOINTMENT").length;

    await request(app.getHttpServer())
      .post("/notifications/scan")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    const after = await request(app.getHttpServer())
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const countAfter = after.body.filter((n: { type: string }) => n.type === "APPOINTMENT").length;

    expect(countAfter).toBe(countBefore);
  });

  it("génère une alerte de commande en retard et une alerte de dette", async () => {
    const orderRes = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerId,
        modelName: "Costume",
        price: 20000,
        deposit: 5000,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);

    // La création refuse une date limite passée (voir orders.e2e-spec.ts) ; on simule le
    // passage du temps en base pour tester la détection du retard.
    await prisma.order.update({
      where: { id: orderRes.body.id },
      data: { dueDate: new Date(Date.now() - 86400000) },
    });

    const res = await request(app.getHttpServer())
      .post("/notifications/scan")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(res.body.some((n: { type: string }) => n.type === "DELAY")).toBe(true);
    expect(res.body.some((n: { type: string }) => n.type === "DEBT")).toBe(true);
  });

  it("génère une alerte de stock faible pour un tissu", async () => {
    await request(app.getHttpServer())
      .post("/fabrics")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Wax épuisé", quantity: 1 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    // Le stock initial ne déclenche pas encore le scan (pas de mutation de mouvement) ;
    // on force un scan explicite pour vérifier la détection.
    const scan = await request(app.getHttpServer())
      .post("/notifications/scan")
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(scan.body.some((n: { type: string }) => n.type === "STOCK")).toBe(true);
    void res;
  });

  it("résout automatiquement l'alerte de stock après réapprovisionnement", async () => {
    const fabricRes = await request(app.getHttpServer())
      .post("/fabrics")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bazin critique", quantity: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/fabrics/${fabricRes.body.id}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "IN", quantity: 1 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/fabrics/${fabricRes.body.id}/movements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "IN", quantity: 20 })
      .expect(201);
    expect(res.body.quantity).toBe(22);

    const notifs = await request(app.getHttpServer())
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(
      notifs.body.some(
        (n: { type: string; relatedEntityId: string }) =>
          n.type === "STOCK" && n.relatedEntityId === fabricRes.body.id,
      ),
    ).toBe(false);
  });

  it("marque une notification comme lue", async () => {
    const list = await request(app.getHttpServer())
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const target = list.body[0];

    const res = await request(app.getHttpServer())
      .patch(`/notifications/${target.id}/read`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.read).toBe(true);
  });

  it("filtre les notifications non lues", async () => {
    const res = await request(app.getHttpServer())
      .get("/notifications?unread=true")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.every((n: { read: boolean }) => n.read === false)).toBe(true);
  });
});
