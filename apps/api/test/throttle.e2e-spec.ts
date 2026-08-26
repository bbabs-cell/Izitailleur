import { Controller, Get, INestApplication, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
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

function redisThrottleTestModule(redisUrl: string) {
  @Module({
    imports: [
      ThrottlerModule.forRoot({
        throttlers: [{ ttl: 60000, limit: 3 }],
        storage: new ThrottlerStorageRedisService(redisUrl),
      }),
    ],
    controllers: [PingController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  })
  class RedisThrottleTestModule {}
  return RedisThrottleTestModule;
}

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

// Sur un hébergement serverless (Vercel), chaque requête peut être traitée par une instance
// sans mémoire partagée avec la précédente — un stockage en mémoire locale ne protégerait alors
// plus vraiment contre le brute-force. Ce test prouve, avec un vrai Redis (pas de simulation),
// que deux instances applicatives distinctes partagent bien leurs compteurs quand elles pointent
// vers le même stockage Redis, reproduisant ce que ferait deux invocations serverless séparées.
describe("Rate limiting partagé via Redis (e2e)", () => {
  if (!process.env.REDIS_URL) {
    it.skip("nécessite REDIS_URL (Redis local non configuré pour ce run)", () => {});
    return;
  }

  let appA: INestApplication;
  let appB: INestApplication;

  beforeAll(async () => {
    const buildRedisApp = async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [redisThrottleTestModule(process.env.REDIS_URL!)],
      }).compile();
      const app: INestApplication = moduleRef.createNestApplication();
      await app.init();
      return app;
    };

    appA = await buildRedisApp();
    appB = await buildRedisApp();
  });

  afterAll(async () => {
    await appA.close();
    await appB.close();
  });

  it("deux instances applicatives distinctes partagent le même compteur via Redis", async () => {
    await request(appA.getHttpServer()).get("/ping").expect(200);
    await request(appB.getHttpServer()).get("/ping").expect(200);
    await request(appA.getHttpServer()).get("/ping").expect(200);
    // La limite (3) est atteinte au total entre les deux instances : la 4e requête, même sur
    // une "nouvelle" instance B, doit être bloquée — preuve que le compteur n'est pas local.
    await request(appB.getHttpServer()).get("/ping").expect(429);
  });
});
