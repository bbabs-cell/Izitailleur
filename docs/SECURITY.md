# IZITAILLEUR — Sécurité

## Authentification

- JWT access token (15 min) + refresh token (30 jours), signés avec des secrets distincts
  (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`), jamais commités (voir `.env.example`).
- Mots de passe hachés avec **argon2** (jamais en clair, jamais réversibles).
- Le refresh token est lui-même haché en base (`User.refreshTokenHash`) — un vol de la base ne
  permet pas de forger une session valide.
- Rafraîchissement automatique côté mobile sur 401, avec re-tentative unique de la requête
  d'origine (`apps/mobile/src/api/client.ts`).

## Autorisation

- Toutes les routes protégées passent par `JwtAuthGuard` (audit : tous les contrôleurs API en
  sont dotés à l'exception d'`AuthController`, volontairement public).
- **RBAC** (`RolesGuard` + décorateur `@Roles`) restreint : la gestion de l'équipe (inviter,
  changer un rôle, retirer un membre) à OWNER/ADMIN, et l'ensemble du module Finances
  (paiements, reçus, dettes, statistiques, réponses financières de l'assistant IA) à
  OWNER/ADMIN/MANAGER. Un apprenti n'a accès à aucune donnée financière — vérifié par des tests
  explicites (403 attendu) dans `payments.e2e-spec.ts` et `ai.e2e-spec.ts`.
- **Isolation par atelier** : chaque requête est filtrée par le `workshopId` extrait du JWT,
  jamais fourni par le client — un utilisateur ne peut ni lire ni modifier les données d'un
  autre atelier (vérifié par test).

## Validation des entrées

- Tous les corps de requête sont validés par des schémas **Zod** partagés entre mobile et API
  (`packages/shared`), avec limites de longueur explicites sur chaque champ texte.
- Le pipe de validation est attaché au décorateur `@Body()` de chaque route (une régression
  découverte et corrigée en Phase 2 : `@UsePipes` au niveau méthode validait à tort tous les
  paramètres, y compris l'utilisateur courant injecté par `@CurrentUser()`).

## Durcissement HTTP (Phase 8)

- **helmet** : en-têtes de sécurité HTTP standards (CSP de base, `X-Content-Type-Options`,
  `X-Frame-Options`, etc.).
- **Limitation de débit** (`@nestjs/throttler`) : limite globale de 120 requêtes/minute par IP,
  et limite stricte de 10 tentatives/minute par IP sur `/auth/register`, `/auth/login` et
  `/auth/refresh` — protection anti-brute-force. Vérifié par un test dédié
  (`throttle.e2e-spec.ts`) confirmant qu'une requête au-delà de la limite reçoit bien un 429.

## Secrets

- Aucun secret n'est présent dans le code source. `.env.example` ne contient que des valeurs
  d'exemple explicitement nommées `change-me-*`.
- Aucune clé API tierce n'est utilisée : l'assistant IA (Phase 7) est un moteur déterministe
  sans appel externe ; aucun service de paiement fictif n'a été câblé (voir PRODUCT.md).

## Ce qui reste hors périmètre (à traiter avant une mise en production réelle)

- Pas de rotation automatique des secrets JWT.
- Pas de verrouillage de compte après échecs de connexion répétés (seule la limitation de
  débit par IP est en place).
- Pas d'audit log dédié des actions sensibles (suppression, changement de rôle) — l'historique
  fonctionnel existe (`OrderStatusChange`, `FabricMovement`) mais pas un journal de sécurité
  générique.
- Hébergement, sauvegardes et gestion des secrets en production restent à définir (signalé
  comme décision en attente dans ARCHITECTURE.md depuis la Phase 0).
