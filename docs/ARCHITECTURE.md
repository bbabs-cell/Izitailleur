# IZITAILLEUR — Architecture

## État au démarrage

Le dépôt était vide (aucun fichier, aucun commit) au début du projet. L'architecture ci-dessous
est une proposition initiale, à valider avant implémentation de la PHASE 1.

## Vue d'ensemble

Monorepo pnpm avec trois espaces :

```
izitailleur/
├── apps/
│   ├── mobile/        # App React Native (Expo, TypeScript) — clients finaux (tailleurs)
│   └── api/            # Backend NestJS (TypeScript) — API REST + logique métier
├── packages/
│   └── shared/         # Types TypeScript + schémas de validation Zod partagés mobile/api
├── docs/                # Documentation vivante (ce dossier)
└── ...config racine (pnpm-workspace.yaml, tsconfig de base, etc.)
```

## Choix technologiques et justification

| Décision | Choix | Alternative écartée | Raison |
|---|---|---|---|
| App mobile | React Native + Expo | Flutter | Écosystème TS partagé avec le backend, forte communauté, EAS build simplifie le déploiement Android (priorité marché) |
| Langage | TypeScript partout | JS | Sécurité de type sur un modèle de données riche (17+ entités liées) |
| Backend | NestJS | Express nu, Fastify nu | Modularité, DI, RBAC/guards natifs, structure qui tient à l'échelle (équipes, permissions) |
| ORM / DB | Prisma + PostgreSQL | MongoDB | Modèle fortement relationnel (Client→Commande→Mensurations→Paiements...), intégrité référentielle critique pour l'argent et le stock |
| Auth | JWT (access + refresh) | Sessions serveur | App mobile stateless, fonctionne bien offline-first |
| Stockage offline | SQLite (expo-sqlite) | Realm, WatermelonDB | Simplicité, contrôle total du schéma et de la stratégie de sync, pas de dépendance à un service tiers |
| Sync | Moteur maison (file de mutations + horodatage + résolution de conflits explicite) | Sync automatique d'un BaaS | Exigence explicite : jamais prétendre qu'une sync fonctionne sans l'avoir testée ; besoin de contrôle fin (ex: paiements ne doivent jamais se dupliquer) |
| Tests | Jest (api + mobile), Supertest (api), Testing Library (mobile) | — | Standard de l'écosystème RN/Nest |

## Modèle de données (base — voir DATABASE.md à créer en Phase 2)

Entités minimales prévues dès la conception :

`User, Workshop, Customer, MeasurementProfile, Measurement, Order, OrderImage, OrderTask,
Employee, Appointment, Fabric, FabricMovement, Supplier, Payment, Receipt, Debt,
WorkshopIssue, Notification`

Chaque entité critique porte `createdAt`, `updatedAt`, `deletedAt` (suppression douce).

## Sécurité (base — détaillée en PHASE 8 dans SECURITY.md)

- Authentification JWT, autorisation par rôle (RBAC) au niveau atelier.
- Aucun secret côté frontend/mobile.
- Validation des entrées à la frontière API (Zod/DTO NestJS).
- Journalisation des actions sensibles (suppression, paiement, changement de rôle).

## Ce qui n'est PAS encore décidé (à valider avec le propriétaire du produit)

- Hébergement du backend et de la base de données (coût, fournisseur).
- Stratégie de stockage des photos (S3-compatible ? local + CDN ?).
- Fournisseur de notifications push.
- Portée exacte de l'intégration IA (PHASE 7) — aucun appel à un service IA externe ne sera
  câblé sans validation explicite (coût, fournisseur, confidentialité des données clients).

Ces points seront soumis à validation avant d'être implémentés, conformément à la règle de
décision du projet (changements profonds = validation requise).
