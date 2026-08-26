import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Employees (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: ownerToken } = await registerWorkshop(app, "+221794"));
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  let apprenticeId: string;
  let apprenticeToken: string;
  const apprenticePhone = `+22179998${Date.now().toString().slice(-4)}`;
  const otherPhone = `+22179997${Date.now().toString().slice(-4)}`;

  it("invite un apprenti", async () => {
    const res = await request(app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ fullName: "Fatou Ndiaye", phone: apprenticePhone, password: "demo12345", role: "APPRENTICE" })
      .expect(201);
    apprenticeId = res.body.id;
    expect(res.body.role).toBe("APPRENTICE");

    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ phone: apprenticePhone, password: "demo12345" })
      .expect(200);
    apprenticeToken = login.body.accessToken;
  });

  it("refuse l'invitation par un rôle non autorisé (apprenti)", async () => {
    await request(app.getHttpServer())
      .post("/employees")
      .set("Authorization", `Bearer ${apprenticeToken}`)
      .send({ fullName: "Autre", phone: otherPhone, password: "demo12345", role: "TAILOR" })
      .expect(403);
  });

  it("liste les employés de l'atelier", async () => {
    const res = await request(app.getHttpServer())
      .get("/employees")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("change le rôle d'un employé", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/employees/${apprenticeId}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "FINISHER" })
      .expect(200);
    expect(res.body.role).toBe("FINISHER");
  });

  it("refuse qu'un employé se retire lui-même", async () => {
    const me = await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/employees/${me.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .expect(409);
  });
});
