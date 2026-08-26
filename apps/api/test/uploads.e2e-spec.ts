import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

// Le stockage des photos (Cloudflare R2) n'est actif que si les variables d'environnement R2
// sont définies (voir UploadsService). Aucun compte R2 réel n'est disponible dans cet
// environnement de test : on vérifie donc honnêtement le comportement réel dans cet état — la
// fonctionnalité échoue explicitement (503) plutôt que de prétendre fonctionner — ainsi que les
// vérifications d'autorisation et de validation qui, elles, s'exécutent avant tout appel à R2.
describe("Uploads — présignature des photos de commande (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let orderId: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: ownerToken } = await registerWorkshop(app, "+221792"));

    const customerRes = await request(app.getHttpServer())
      .post("/customers")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ firstName: "Modou", lastName: "Fall" })
      .expect(201);

    const orderRes = await request(app.getHttpServer())
      .post("/orders")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        customerId: customerRes.body.id,
        modelName: "Chemise",
        price: 12000,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    orderId = orderRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it("refuse l'accès sans authentification", async () => {
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/images/upload-url`)
      .send({ contentType: "image/jpeg" })
      .expect(401);
  });

  it("refuse un type de contenu qui n'est pas une image supportée", async () => {
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/images/upload-url`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ contentType: "application/pdf" })
      .expect(400);
  });

  it("refuse une commande introuvable pour cet atelier avant tout appel au stockage", async () => {
    const { accessToken: otherToken } = await registerWorkshop(app, "+221793");
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/images/upload-url`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ contentType: "image/jpeg" })
      .expect(404);
  });

  it("échoue explicitement (503) quand le stockage R2 n'est pas configuré, sans prétendre fonctionner", async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/images/upload-url`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ contentType: "image/jpeg" })
      .expect(503);
    expect(res.body.message).toMatch(/pas configuré/i);
  });
});
