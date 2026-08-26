import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Customers (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: token } = await registerWorkshop(app, "+221798"));
    ({ accessToken: otherToken } = await registerWorkshop(app, "+221797"));
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  let customerId: string;

  it("refuse un client sans nom", async () => {
    await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "", lastName: "Diallo" })
      .expect(400);
  });

  it("crée un client", async () => {
    const res = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Mamadou", lastName: "Diallo", phone: "+221700000010" })
      .expect(201);
    expect(res.body.id).toBeDefined();
    customerId = res.body.id;
  });

  it("isole les clients par atelier", async () => {
    const res = await request(app.getHttpServer())
      .get(`/customers/${customerId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(404);
    expect(res.body.message).toBeDefined();
  });

  it("crée un profil de mensurations puis conserve l'historique des mesures", async () => {
    const profileRes = await request(app.getHttpServer())
      .post(`/customers/${customerId}/measurement-profiles`)
      .set("Authorization", `Bearer ${token}`)
      .send({ label: "Boubou standard" })
      .expect(201);
    const profileId = profileRes.body.id;

    await request(app.getHttpServer())
      .post(`/customers/measurement-profiles/${profileId}/measurements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ values: { poitrine: 100, taille: 90 } })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/customers/measurement-profiles/${profileId}/measurements`)
      .set("Authorization", `Bearer ${token}`)
      .send({ values: { poitrine: 102, taille: 91 } })
      .expect(201);

    const listRes = await request(app.getHttpServer())
      .get(`/customers/measurement-profiles/${profileId}/measurements`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(listRes.body).toHaveLength(2);
    expect(listRes.body[0].values.poitrine).toBe(102);
    expect(listRes.body[1].values.poitrine).toBe(100);
  });

  it("recherche un client par nom", async () => {
    const res = await request(app.getHttpServer())
      .get("/customers?search=Mamadou")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.some((c: { id: string }) => c.id === customerId)).toBe(true);
  });

  it("supprime (soft-delete) un client, il n'apparaît plus dans la liste", async () => {
    await request(app.getHttpServer())
      .delete(`/customers/${customerId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get("/customers")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.some((c: { id: string }) => c.id === customerId)).toBe(false);
  });
});
