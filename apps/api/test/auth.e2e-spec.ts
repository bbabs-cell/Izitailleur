import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = "test-access";
    process.env.JWT_REFRESH_SECRET = "test-refresh";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone: { startsWith: "+221799" } } });
    await app.close();
  });

  const phone = "+221799000001";

  it("refuse une inscription avec un mot de passe trop court", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ workshopName: "Atelier Test", fullName: "Test User", phone, password: "123" })
      .expect(400);
  });

  it("inscrit un nouveau propriétaire d'atelier et retourne des tokens", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ workshopName: "Atelier Test", fullName: "Test User", phone, password: "demo12345" })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("refuse une seconde inscription avec le même téléphone", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ workshopName: "Autre atelier", fullName: "Test User 2", phone, password: "demo12345" })
      .expect(409);
  });

  it("refuse une connexion avec un mauvais mot de passe", async () => {
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ phone, password: "mauvais-mdp" })
      .expect(401);
  });

  it("connecte l'utilisateur et permet d'accéder à /users/me", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ phone, password: "demo12345" })
      .expect(200);

    const me = await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(me.body.phone).toBe(phone);
    expect(me.body.role).toBe("OWNER");
  });

  it("refuse l'accès à /users/me sans token", async () => {
    await request(app.getHttpServer()).get("/users/me").expect(401);
  });

  it("rafraîchit les tokens avec un refresh token valide", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ phone, password: "demo12345" })
      .expect(200);

    const refreshed = await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);

    expect(refreshed.body.accessToken).toBeDefined();
  });

  it("refuse un refresh token invalide", async () => {
    await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: "token-invalide" })
      .expect(401);
  });
});
