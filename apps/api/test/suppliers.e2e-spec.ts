import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Suppliers (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: token } = await registerWorkshop(app, "+221792"));
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  let supplierId: string;

  it("refuse un fournisseur sans nom", async () => {
    await request(app.getHttpServer())
      .post("/suppliers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" })
      .expect(400);
  });

  it("crée un fournisseur", async () => {
    const res = await request(app.getHttpServer())
      .post("/suppliers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Tissus Sandaga", phone: "+221701112233" })
      .expect(201);
    supplierId = res.body.id;
  });

  it("associe un tissu à un fournisseur", async () => {
    await request(app.getHttpServer())
      .post("/fabrics")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Bazin riche", quantity: 30, supplierId })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/suppliers/${supplierId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.fabrics).toHaveLength(1);
  });

  it("supprime (soft-delete) un fournisseur", async () => {
    await request(app.getHttpServer())
      .delete(`/suppliers/${supplierId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get("/suppliers")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.some((s: { id: string }) => s.id === supplierId)).toBe(false);
  });
});
