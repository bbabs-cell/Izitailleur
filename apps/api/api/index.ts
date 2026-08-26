import "reflect-metadata";
import express, { type Express } from "express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../src/create-app";

/**
 * Point d'entrée serverless (Vercel). Un handler Node Vercel reçoit directement de vrais objets
 * http.IncomingMessage/ServerResponse — une instance Express est elle-même un handler
 * (req, res) valide une fois initialisée, donc on la délègue directement sans wrapper
 * supplémentaire de type "event/context" (celui-ci est fait pour AWS Lambda, pas pour le
 * runtime Node de Vercel).
 *
 * Chaque conteneur lambda peut recevoir plusieurs requêtes tant qu'il reste "chaud" : on met en
 * cache l'instance Express au niveau du module pour réutiliser la même application Nest (et donc
 * la même connexion Prisma) entre invocations chaudes, plutôt que de la reconstruire à chaque
 * requête. Sur un conteneur froid, une nouvelle instance est créée — c'est le fonctionnement
 * normal du serverless, pas une fuite.
 *
 * Important : DATABASE_URL doit pointer vers une connexion Postgres compatible pooling
 * (ex : chaîne "-pooler" fournie par Neon) — voir docs/DEPLOYMENT.md. Sans pooling, un pic
 * d'invocations concurrentes peut épuiser les connexions Postgres disponibles.
 */
let cachedApp: Express | null = null;

async function getExpressApp(): Promise<Express> {
  if (!cachedApp) {
    const expressInstance = express();
    const app = await createApp(expressInstance);
    await app.init();
    cachedApp = expressInstance;
  }
  return cachedApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await getExpressApp();
  expressApp(req, res);
}
