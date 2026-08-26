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
- ~~Portée exacte de l'intégration IA (PHASE 7)~~ — tranché : voir section IA ci-dessous.
  Aucun appel à un service IA externe n'a été câblé.

Ces points seront soumis à validation avant d'être implémentés, conformément à la règle de
décision du projet (changements profonds = validation requise).

## Mode hors connexion et synchronisation (Phase 5)

### Portée réelle (honnêteté de l'implémentation)

Seuls **Clients** et **Rendez-vous (calendrier)** sont pleinement offline-first à ce stade :
lecture ET écriture (création, modification pour les clients) fonctionnent sans connexion,
avec synchronisation différée. Les autres modules (commandes, tâches, tissus, paiements...)
restent en ligne uniquement pour l'instant ; ils suivront le même mécanisme dans une phase
ultérieure. Aucune fonctionnalité offline non listée ici n'est présentée comme disponible.

### Mécanisme

- Base locale **SQLite** (`expo-sqlite`) sur le mobile : une table par entité synchronisable
  (`customers_local`, `appointments_local`) + une file de mutations (`mutation_queue`) + une
  table de métadonnées (`sync_meta`, horodatage de dernière synchro).
- Chaque enregistrement local porte `localUpdatedAt` (dernière modification locale) et
  `serverUpdatedAt` (dernière valeur connue du serveur, utilisée comme base pour la détection
  de conflit).
- Écriture : toute création/modification s'écrit **immédiatement en local** (l'utilisateur
  n'attend jamais le réseau) et empile une mutation dans la file.
- Synchronisation (`POST /sync/push` puis `GET /sync/pull?since=...`), déclenchée : au retour
  réseau (écoute `NetInfo`), au retour au premier plan de l'app, et manuellement (écran
  Synchronisation).
- **Détection de conflit réelle** : chaque mutation de mise à jour envoie `baseUpdatedAt` (la
  version sur laquelle l'édition locale s'est basée). Si `updatedAt` du serveur est plus récent
  que cette base, le serveur refuse la mutation et renvoie sa version actuelle — ce n'est pas
  un simple "dernier écrit gagne" silencieux.
- **Résolution de conflit** : présentée à l'utilisateur (écran Synchronisation) avec les deux
  versions côte à côte ; choix explicite « Garder ma version » (repousse la modification avec
  la nouvelle base) ou « Utiliser le serveur » (écrase la copie locale).
- Idempotence : un identifiant est généré côté client (`expo-crypto` `randomUUID`) dès la
  création, avant toute synchronisation — rejouer une création déjà appliquée ne crée jamais de
  doublon (testé).

### Ce qui est réellement testé

- API : 9 tests e2e contre PostgreSQL réel, incluant un scénario de conflit à deux appareils
  (`apps/api/test/sync.e2e-spec.ts`).
- Mobile : la logique pure de décision (ignorer un pull sur un enregistrement encore modifié
  localement, actions à prendre après le résultat d'un push, fusion de la file de mutations)
  est testée unitairement (`apps/mobile/src/__tests__/syncLogic.test.ts`). Le moteur SQLite/
  réseau complet (`syncEngine.ts`, `SyncContext.tsx`) n'a **pas** pu être exercé par un test
  automatisé dans cet environnement (pas d'émulateur/appareil disponible) — il doit être vérifié
  manuellement avant mise en production réelle.

## Notifications (Phase 6)

### Mécanisme

- **Alertes calculées côté serveur**, jamais inventées : `NotificationsService.scan(workshopId)`
  relit les données réelles (rendez-vous proches, commandes en retard/urgentes/dues demain,
  dettes, stock faible, tâches en retard, problèmes urgents) et crée/supprime des notifications
  en conséquence. Une notification est unique par `(atelier, type, entité liée)` : jamais de
  doublon, et elle disparaît automatiquement quand la condition qui l'a déclenchée est résolue
  (commande livrée, dette payée, tissu réapprovisionné, tâche terminée, problème résolu).
- La plupart des mutations (création de commande, paiement, mouvement de stock, résolution de
  problème...) déclenchent directement la mise à jour des notifications concernées.
- Les vérifications qui dépendent uniquement du temps qui passe (« rendez-vous dans 2h »,
  commande qui devient en retard) ne peuvent pas être déclenchées par une mutation : elles sont
  recalculées via `POST /notifications/scan`, appelé par le mobile à chaque synchronisation et à
  l'ouverture de l'écran Notifications.
- **Rappels locaux sur l'appareil** (`expo-notifications`) : à la création d'un rendez-vous, un
  rappel est programmé nativement sur le téléphone (2h avant par défaut), sans dépendre d'un
  serveur de push — fonctionne même hors connexion.

### Limite assumée et documentée

**Aucun push distant (remote push / FCM / APNs) n'est câblé.** Depuis le SDK 53 d'Expo, les
notifications push distantes ne fonctionnent plus dans Expo Go et nécessitent un build de
développement dédié (confirmé par un avertissement d'`expo-notifications` observé pendant les
tests). Tant que l'app tourne sous Expo Go dans cet environnement, seules les notifications
**locales** (programmées sur l'appareil) et les alertes **in-app** (récupérées au moment de la
synchronisation) sont réellement fonctionnelles. Le passage à un vrai push distant est un
changement d'infrastructure (build EAS, projet Expo Push) à valider séparément avant
implémentation, conformément à la règle de décision du projet.

### Ce qui est réellement testé

- API : 7 tests e2e contre PostgreSQL réel (`apps/api/test/notifications.e2e-spec.ts`) —
  génération sans doublon, résolution automatique (stock réapprovisionné, dette payée), alerte
  de retard/dette, marquage lu, filtrage non-lues.
- Mobile : la fonction pure de calcul de l'heure de rappel local (`computeReminderTriggerDate`)
  est testée unitairement, y compris les cas limites (rendez-vous déjà passé, trop proche pour
  laisser un délai). L'appel réel à l'API de notifications native de l'appareil n'est pas testé
  automatiquement (nécessite un appareil/émulateur).

## Assistant IA (Phase 7)

### Décision (validée avec l'utilisateur avant implémentation)

Deux options ont été soumises : un moteur déterministe (aucun appel externe) ou une couche de
compréhension du langage naturel appuyée sur l'API Claude d'Anthropic (nécessitant une clé API,
un coût par requête, et l'envoi de données de l'atelier à un service tiers). **L'option moteur
déterministe a été choisie.** Aucun appel à un service IA externe n'est câblé dans le code.

### Mécanisme

`AiService` (`apps/api/src/ai/ai.service.ts`) reconnaît les questions par mots-clés (en
français, insensible aux accents) et traduit chaque question reconnue en une vraie requête sur
les données de l'atelier — jamais de réponse inventée. Questions couvertes (celles listées dans
le cahier des charges) :

- « Qu'est-ce que je dois faire aujourd'hui ? » → rendez-vous du jour, commandes à livrer
  aujourd'hui, tâches assignées à l'utilisateur non terminées.
- « Quelles commandes sont en retard ? » → commandes non livrées dont la date limite est
  dépassée.
- « Pourquoi mes commandes sont-elles en retard ? » → même liste, avec les problèmes d'atelier
  liés à chaque commande (ou « aucun problème signalé » si rien n'a été consigné — jamais de
  cause inventée).
- « Qui travaille sur la commande #XXXX ? » → responsable + personnes assignées aux tâches de
  cette commande précise.
- « Qui me doit de l'argent ? » → dettes réelles, **restreint aux rôles autorisés** (OWNER/
  ADMIN/MANAGER, comme le reste du module Finances) ; un apprenti reçoit une réponse explicite
  de refus d'accès, jamais les données.
- « Quel tissu va bientôt manquer ? » → tissus en stock faible.
- Toute question non reconnue → réponse honnête (« je ne comprends pas ») avec des exemples,
  plutôt qu'une réponse générique ou devinée.

### Ce qui est réellement testé

11 tests e2e contre PostgreSQL réel (`apps/api/test/ai.e2e-spec.ts`), couvrant les six types de
questions du cahier des charges, la détection d'une commande introuvable (pas d'invention), le
respect des permissions financières par rôle, et le refus honnête d'une question hors périmètre.
