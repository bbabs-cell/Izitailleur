import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp, registerWorkshop } from "./helpers";

describe("Appointments (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    ({ accessToken: token } = await registerWorkshop(app, "+221795"));
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  const day = "2027-03-15";

  it("refuse des paramètres de date invalides", async () => {
    await request(app.getHttpServer())
      .get("/appointments?from=not-a-date&to=also-not-a-date")
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });

  it("crée des rendez-vous et détecte une journée chargée", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post("/appointments")
        .set("Authorization", `Bearer ${token}`)
        .send({
          type: "FITTING",
          title: `Essayage ${i}`,
          startAt: `${day}T0${i + 1}:00:00.000Z`,
        })
        .expect(201);
    }

    const res = await request(app.getHttpServer())
      .get(`/appointments?from=${day}T00:00:00.000Z&to=${day}T23:59:59.000Z`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.appointments).toHaveLength(5);
    expect(res.body.busyDays).toEqual([{ date: day, count: 5 }]);
  });

  it("supprime un rendez-vous", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/appointments")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "OTHER", title: "À supprimer", startAt: "2027-04-01T10:00:00.000Z" })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/appointments/${createRes.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get("/appointments?from=2027-04-01T00:00:00.000Z&to=2027-04-01T23:59:59.000Z")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body.appointments).toHaveLength(0);
  });
});
