import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ExpressAdapter } from "@nestjs/platform-express";
import helmet from "helmet";
import type { Express } from "express";
import { AppModule } from "./app.module";

/** Construction de l'application Nest, partagée entre le serveur classique (main.ts) et le point d'entrée serverless (api/index.ts pour Vercel). */
export async function createApp(expressInstance?: Express): Promise<NestExpressApplication> {
  const app = expressInstance
    ? await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(expressInstance))
    : await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());
  return app;
}
