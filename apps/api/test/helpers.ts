import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

export async function createTestApp() {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "test-access";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh";

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

export async function registerWorkshop(app: INestApplication, phonePrefix: string) {
  const phone = `${phonePrefix}${Date.now().toString().slice(-7)}`;
  const res = await request(app.getHttpServer())
    .post("/auth/register")
    .send({
      workshopName: "Atelier de test",
      fullName: "Propriétaire Test",
      phone,
      password: "demo12345",
    })
    .expect(201);
  return { accessToken: res.body.accessToken as string, phone };
}
