import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Dashboard (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let customerId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: ownerToken } = await registerWorkshop(app, "+221788"));

    const customerRes = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ firstName: "Awa", lastName: "Diop" })
      .expect(201);
    customerId = customerRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  function getDashboard(token = ownerToken) {
    return request(app.getHttpServer()).get("/dashboard").set("Authorization", `Bearer ${token}`);
  }

  it("renvoie une structure vide cohérente pour un atelier neuf", async () => {
    const res = await getDashboard().expect(200);
    expect(res.body.today.appointments).toEqual([]);
    expect(res.body.today.dueOrders).toEqual([]);
    expect(res.body.today.myTasks).toEqual([]);
    expect(res.body.urgent.lateOrders).toEqual([]);
    expect(res.body.stock.lowStockFabrics).toEqual([]);
    expect(res.body.money).toEqual({ totalDebt: 0, debtorsCount: 0, revenueThisMonth: 0 });
    expect(res.body.team).toEqual({ tasksByAssignee: [] });
  });

  let orderId: string;
  let orderReference: string;

  it("place une commande en retard dans 'urgent.lateOrders'", async () => {
    const orderRes = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        customerId,
        modelName: "Boubou",
        price: 20000,
        deposit: 5000,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    orderId = orderRes.body.id;
    orderReference = orderRes.body.reference;

    await prisma.order.update({
      where: { id: orderId },
      data: { dueDate: new Date(Date.now() - 86400000) },
    });

    const res = await getDashboard().expect(200);
    expect(res.body.urgent.lateOrders.map((o: { reference: string }) => o.reference)).toContain(
      orderReference,
    );
    expect(res.body.urgent.dueSoonOrders).toEqual([]);
  });

  it("calcule la dette totale dans 'money' pour un rôle autorisé", async () => {
    const res = await getDashboard().expect(200);
    expect(res.body.money.totalDebt).toBe(15000);
    expect(res.body.money.debtorsCount).toBe(1);
  });

  it("place une commande due bientôt dans 'urgent.dueSoonOrders'", async () => {
    await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        customerId,
        modelName: "Robe",
        price: 10000,
        dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      })
      .expect(201);

    const res = await getDashboard().expect(200);
    expect(res.body.urgent.dueSoonOrders.length).toBe(1);
  });

  it("signale un tissu en stock faible dans 'stock'", async () => {
    await request(app.getHttpServer())
      .post("/fabrics")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Wax en rupture", quantity: 2 })
      .expect(201);

    const res = await getDashboard().expect(200);
    expect(res.body.stock.lowStockFabrics.map((f: { name: string }) => f.name)).toContain(
      "Wax en rupture",
    );
  });

  it("regroupe les tâches assignées par employé dans 'team'", async () => {
    const employeePhone = `+22179997${Date.now().toString().slice(-4)}`;
    const employeeRes = await request(app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ fullName: "Tailleur Test", phone: employeePhone, password: "demo12345", role: "TAILOR" })
      .expect(201);

    const task = await prisma.orderTask.create({
      data: { orderId, title: "Coudre la manche", assignedToId: employeeRes.body.id },
    });

    const res = await getDashboard().expect(200);
    expect(res.body.team.tasksByAssignee).toEqual([
      expect.objectContaining({
        userId: employeeRes.body.id,
        fullName: "Tailleur Test",
        pendingCount: 1,
      }),
    ]);
    expect(res.body.team.tasksByAssignee[0].tasks[0].id).toBe(task.id);
  });

  it("retourne mes tâches assignées non terminées dans 'today.myTasks'", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ phone: (await prisma.user.findFirstOrThrow({ where: { fullName: "Tailleur Test" } })).phone, password: "demo12345" })
      .expect(200);

    const res = await getDashboard(login.body.accessToken).expect(200);
    expect(res.body.today.myTasks.length).toBe(1);
    expect(res.body.today.myTasks[0].title).toBe("Coudre la manche");
  });

  it("cache 'money' et 'team' pour un rôle non autorisé", async () => {
    const apprenticePhone = `+22179998${Date.now().toString().slice(-4)}`;
    await request(app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ fullName: "Apprenti Dashboard", phone: apprenticePhone, password: "demo12345", role: "APPRENTICE" })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ phone: apprenticePhone, password: "demo12345" })
      .expect(200);

    const res = await getDashboard(login.body.accessToken).expect(200);
    expect(res.body.money).toBeNull();
    expect(res.body.team).toBeNull();
    expect(res.body.today).toBeDefined();
    expect(res.body.stock).toBeDefined();
  });

  it("refuse l'accès sans authentification", async () => {
    await request(app.getHttpServer()).get("/dashboard").expect(401);
  });
});
