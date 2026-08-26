# IZITAILLEUR — Déploiement en production

Ce document décrit comment mettre en ligne le backend, la base de données et le stockage des
photos, avec l'infrastructure validée (voir ARCHITECTURE.md) : **Vercel** (API), **Neon**
(PostgreSQL, via l'intégration Vercel Postgres), **Cloudflare R2** (photos), **Upstash Redis**
(anti-brute-force partagé).

**État réel au moment de la rédaction** : tout le code ci-dessous est écrit, testé et poussé sur
le dépôt. Aucun compte cloud réel n'a été créé pour ce projet — les étapes qui suivent créent de
vraies ressources et doivent être exécutées par une personne ayant accès à une carte de paiement
et aux comptes de l'atelier (Vercel, Cloudflare, Upstash). Rien de tout cela n'a donc pu être
vérifié en conditions de production réelles ; seul le code a été testé localement (voir le detail
« Vérifié / Non vérifié » à la fin de chaque section).

## 1. Base de données — Vercel Postgres (Neon)

1. Dans le tableau de bord Vercel du projet, onglet **Storage** → **Create Database** → **Postgres**
   (propulsé par Neon).
2. Une fois créée, Vercel propose deux chaînes de connexion. **Utiliser impérativement la chaîne
   poolée** (celle qui contient `-pooler` dans le nom d'hôte) comme `DATABASE_URL` — sans ça, un
   pic de trafic sur les fonctions serverless peut épuiser les connexions Postgres disponibles.
3. Appliquer les migrations Prisma contre cette base :
   ```
   DATABASE_URL="<chaîne pooler>" pnpm --filter @izitailleur/api exec prisma migrate deploy
   ```
4. **Sauvegardes** : Neon effectue des snapshots automatiques quotidiens sans configuration
   supplémentaire (décision validée — voir ARCHITECTURE.md). Vérifier dans le tableau de bord
   Neon que la rétention proposée par le plan choisi correspond au besoin réel de l'atelier.

**Vérifié** : les migrations Prisma s'appliquent proprement sur PostgreSQL (testé en local,
mécanisme identique quel que soit l'hôte Postgres). **Non vérifié** : le comportement réel contre
une base Neon (latence réseau, pooling réel) — aucun compte Neon réel disponible pour ce test.

## 2. API — Vercel

1. Importer le dépôt GitHub dans Vercel, avec **Root Directory** réglé sur `apps/api`.
2. Vercel détecte `apps/api/vercel.json` (déjà présent dans le dépôt), qui définit la commande
   d'installation, la commande de build (`pnpm build:shared` puis `prisma generate`) et route
   toutes les requêtes vers `api/index.ts`.
3. Renseigner les variables d'environnement (Project Settings → Environment Variables) :
   `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` (voir
   `apps/api/.env.example` pour la liste complète). Générer `JWT_ACCESS_SECRET` et
   `JWT_REFRESH_SECRET` avec des valeurs aléatoires longues (ex : `openssl rand -base64 48`),
   distinctes du développement local.
4. Déployer. L'API répond alors sur `https://<projet>.vercel.app`.

**Vérifié réellement (pas de simulation)** : le point d'entrée serverless
(`apps/api/api/index.ts`) a été testé en local en le pilotant avec de vrais objets HTTP Node
(pas des mocks) devant un vrai serveur PostgreSQL — inscription d'un atelier puis appel
authentifié à `/dashboard`, réponses 401/201/200 correctes. Ce test reproduit fidèlement le
contrat que Vercel utilise pour ses fonctions Node (`(req, res)` avec de vrais objets HTTP), donc
il donne une garantie réelle sur le code, mais **pas** sur l'infrastructure Vercel elle-même
(cold starts réels, limites de durée, comportement réseau) — non testable sans compte réel.

## 3. Anti-brute-force partagé — Upstash Redis

1. Créer une base Redis sur [upstash.com](https://upstash.com) (offre gratuite suffisante au
   démarrage).
2. Copier l'URL de connexion Redis (format `rediss://...`) fournie par Upstash.
3. La renseigner comme `REDIS_URL` dans les variables d'environnement Vercel (étape 2).

Sans cette variable, l'application démarre quand même (comportement de repli documenté dans
`app.module.ts`), mais la protection anti-brute-force ne serait plus réellement effective sur un
hébergement serverless — ne pas déployer en production sans cette variable.

**Vérifié réellement** : avec un vrai serveur Redis local, deux instances applicatives Nest
distinctes partagent bien le même compteur de requêtes (`apps/api/test/throttle.e2e-spec.ts`,
exécuté avec `REDIS_URL` pointant vers un Redis réel). **Non vérifié** : Upstash spécifiquement
(protocole compatible Redis standard, donc attendu identique, mais pas testé contre leur service).

## 4. Stockage des photos — Cloudflare R2

1. Dans le tableau de bord Cloudflare, **R2** → créer un compartiment (ex : `izitailleur-photos`).
2. Activer l'accès public au compartiment (ou configurer un domaine personnalisé) pour obtenir
   une URL de base publique — c'est la valeur de `R2_PUBLIC_BASE_URL`.
3. **R2** → **Manage API Tokens** → créer un jeton avec accès **Object Read & Write** limité à ce
   compartiment. Noter `Access Key ID` et `Secret Access Key`.
4. Renseigner dans Vercel : `R2_ACCOUNT_ID` (visible dans l'URL du tableau de bord Cloudflare),
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`.

Sans ces variables, la fonctionnalité photo échoue explicitement avec une erreur 503 côté API
(« stockage non configuré ») plutôt que d'être présentée comme fonctionnelle.

**Vérifié réellement** : la génération de l'URL pré-signée est un calcul cryptographique
entièrement local (aucun appel réseau) — testé avec de fausses identifiants R2, l'URL produite
pointe vers le bon compte/compartiment/chemin avec une signature AWS SigV4 valide
(`apps/api/src/uploads/uploads.service.spec.ts`). L'autorisation (une commande ne peut recevoir
une URL de téléversement que si elle appartient à l'atelier de l'utilisateur) et la validation du
type de fichier sont testées en e2e contre l'API réelle. **Non vérifié** : l'upload réel d'un
fichier vers un vrai compartiment R2 (aucun compte R2 réel disponible) — le trajet
mobile → URL pré-signée → PUT direct vers R2 → confirmation à l'API est écrit et cohérent avec la
documentation officielle R2/S3, mais son fonctionnement réel de bout en bout reste à valider à la
première utilisation en production.

## 5. Application mobile

L'app mobile continue de pointer vers l'API via `EXPO_PUBLIC_API_URL` (voir `apps/mobile/src/api/client.ts`).
Une fois l'API déployée sur Vercel, définir cette variable sur l'URL Vercel avant de builder l'app
avec EAS Build (non couvert par ce document — décision de mise en boutique/distribution à traiter
séparément).
