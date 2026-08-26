# IZITAILLEUR

L'assistant intelligent des tailleurs et ateliers de couture.

Voir `docs/PRODUCT.md` pour la vision produit et `docs/ARCHITECTURE.md` pour l'architecture
technique et les choix effectués.

## Structure

```
apps/api/       API backend (NestJS + Prisma + PostgreSQL)
apps/mobile/    Application mobile (Expo + React Native, TypeScript)
packages/shared/ Types et schémas de validation partagés
docs/            Documentation vivante du projet
```

## Démarrage rapide

Prérequis : Node.js 20+, pnpm, PostgreSQL.

```bash
pnpm install

# API
cp apps/api/.env.example apps/api/.env   # ajuster DATABASE_URL et secrets JWT
pnpm --filter @izitailleur/api prisma:migrate
pnpm --filter @izitailleur/api seed        # données de démo (dev uniquement)
pnpm api:dev

# Mobile
pnpm mobile:start
```

## Tests

```bash
pnpm api:test       # API — Jest + Supertest, contre une vraie base PostgreSQL
pnpm --filter @izitailleur/mobile test   # Mobile — Jest + Testing Library
```
