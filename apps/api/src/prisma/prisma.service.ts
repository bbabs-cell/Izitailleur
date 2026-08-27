import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Neon (et pgbouncer en général) exige ce paramètre pour désactiver le cache de requêtes
 * préparées de Prisma, incompatible avec le pooling en mode transaction — sans lui, les
 * opérations multi-requêtes (ex : transactions) échouent en production sur la connexion
 * poolée. Ajouté ici plutôt que dans la variable d'environnement elle-même car celle-ci est
 * gérée automatiquement par l'intégration Vercel/Neon et n'est pas éditable manuellement.
 */
function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("pgbouncer=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}pgbouncer=true`;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = resolveDatabaseUrl();
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
