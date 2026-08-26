import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Issues (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: token } = await registerWorkshop(app, "+221791"));
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  let issueId: string;

  it("crée un problème d'atelier", async () => {
    const res = await request(app.getHttpServer())
      .post("/issues")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Machine en panne",
        category: "MACHINE_BREAKDOWN",
        priority: "URGENT",
        description: "La machine à coudre 2 ne démarre plus",
      })
      .expect(201);
    issueId = res.body.id;
    expect(res.body.status).toBe("OPEN");
  });

  it("liste les problèmes ouverts", async () => {
    const res = await request(app.getHttpServer())
      .get("/issues?status=OPEN")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.some((i: { id: string }) => i.id === issueId)).toBe(true);
  });

  it("résout un problème avec une solution", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/issues/${issueId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "RESOLVED", solution: "Réparée par le technicien" })
      .expect(200);
    expect(res.body.status).toBe("RESOLVED");
    expect(res.body.resolvedAt).not.toBeNull();
  });
});
