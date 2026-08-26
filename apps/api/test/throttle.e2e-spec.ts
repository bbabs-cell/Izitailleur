import { Controller, Get, INestApplication, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { Test } from "@nestjs/testing";
import request from "supertest";

// Vérifie que le mécanisme anti-brute-force (@nestjs/throttler + ThrottlerGuard), utilisé
// tel quel par AuthController avec une limite stricte en production, bloque effectivement
// les requêtes au-delà de la limite configurée. On isole ici un mini-module avec une limite
// volontairement basse pour rendre le test rapide et déterministe, plutôt que d'attendre une
// minute réelle contre le vrai AuthController.
@Controller("ping")
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 3 }])],
  controllers: [PingController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class ThrottleTestModule {}

describe("Rate limiting (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ThrottleTestModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("laisse passer les requêtes sous la limite puis bloque au-delà avec 429", async () => {
    await request(app.getHttpServer()).get("/ping").expect(200);
    await request(app.getHttpServer()).get("/ping").expect(200);
    await request(app.getHttpServer()).get("/ping").expect(200);
    await request(app.getHttpServer()).get("/ping").expect(429);
  });
});
