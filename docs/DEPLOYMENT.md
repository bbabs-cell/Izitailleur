# IZITAILLEUR — Déploiement en production

Ce document décrit comment mettre en ligne le backend, la base de données et le stockage des
photos, avec l'infrastructure validée (voir ARCHITECTURE.md) : **Vercel** (API), **Neon**
(PostgreSQL, via l'intégration Vercel Postgres), **Cloudflare R2** (photos), **Upstash Redis**
(anti-brute-force partagé).

**État réel (mis à jour au 27/08/2026 — mise en production complète)** : l'API tourne réellement
sur Vercel, connectée à une vraie base Neon, un vrai Redis Upstash et un vrai compartiment
Cloudflare R2. Inscription, connexion, tableau de bord, création de commande, anti-brute-force et
upload de photo ont tous été testés directement contre l'infrastructure de production réelle
(pas de simulation). Les quatre briques (hébergement, sauvegardes, stockage des photos, secrets)
sont en place et vérifiées.

## 1. Base de données — Vercel Postgres (Neon)

1. Dans le tableau de bord Vercel du projet, onglet **Storage** → **Create Database** → **Postgres**
   (propulsé par Neon).
2. Une fois créée, Vercel propose deux chaînes de connexion. **Utiliser impérativement la chaîne
   poolée** (celle qui contient `-pooler` dans le nom d'hôte) comme `DATABASE_URL` — sans ça, un
   pic de trafic sur les fonctions serverless peut épuiser les connexions Postgres disponibles.
3. Appliquer les migrations Prisma contre cette base, depuis une machine ayant un accès réseau
   direct (pas depuis une session Claude — ces sessions n'ont accès qu'à HTTPS via un proxy, pas
   au protocole PostgreSQL brut) :
   ```
   DATABASE_URL="<chaîne pooler>" pnpm --filter @izitailleur/api exec prisma migrate deploy
   ```
4. **Sauvegardes** : Neon effectue des snapshots automatiques quotidiens sans configuration
   supplémentaire (décision validée — voir ARCHITECTURE.md). Vérifier dans le tableau de bord
   Neon que la rétention proposée par le plan choisi correspond au besoin réel de l'atelier.

**Vérifié réellement en production** : les 6 migrations Prisma ont été appliquées avec succès
contre la base Neon réelle du projet (`neondb`, région Frankfurt) via la chaîne poolée. La base a
ensuite servi une vraie inscription d'atelier et un vrai appel `/dashboard` authentifié.

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

**Vérifié réellement en production** : l'API tourne sur Vercel (`https://api-puce-omega-36.vercel.app`
au moment du déploiement initial). Inscription réelle d'un atelier, connexion, et appel
authentifié à `/dashboard` testés directement contre cette URL — réponses 201/200 correctes avec
de vraies données issues de Neon.

**Piège rencontré et corrigé pendant la mise en place** : Vercel détecte automatiquement un
préréglage "Framework" (ex : NestJS) qui ignore `vercel.json` et utilise son propre système de
build — désactiver ce préréglage (`Settings → Build and Deployment → Framework Preset → Other`)
est nécessaire. Par ailleurs, un projet purement serverless (sans site statique) doit tout de
même fournir un dossier de sortie non vide (`apps/api/public/`, déjà présent dans le dépôt) sans
quoi Vercel échoue avec *"No Output Directory named 'public' found"*.

## 3. Anti-brute-force partagé — Upstash Redis

1. Créer une base Redis sur [upstash.com](https://upstash.com) (offre gratuite suffisante au
   démarrage).
2. Copier l'URL de connexion Redis (format `rediss://...`) fournie par Upstash.
3. La renseigner comme `REDIS_URL` dans les variables d'environnement Vercel (étape 2).

Sans cette variable, l'application démarre quand même (comportement de repli documenté dans
`app.module.ts`), mais la protection anti-brute-force ne serait plus réellement effective sur un
hébergement serverless — ne pas déployer en production sans cette variable.

**Vérifié réellement en production** : avec un vrai serveur Redis local, deux instances
applicatives Nest distinctes partagent bien le même compteur de requêtes
(`apps/api/test/throttle.e2e-spec.ts`, exécuté avec `REDIS_URL` pointant vers un Redis réel). Une
fois `REDIS_URL` (Upstash, région Frankfurt) renseigné sur Vercel et redéployé, 12 tentatives de
connexion successives contre l'API réelle ont donné 401 (identifiants invalides) dix fois puis
429 (limite atteinte) — la protection anti-brute-force est bien active en production.

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

**Vérifié réellement en production, de bout en bout** : présignature (`POST /orders/:id/images/upload-url`)
contre l'API réelle → upload direct d'un fichier JPEG vers le compartiment R2 réel via PUT sur
l'URL pré-signée (200) → photo accessible publiquement via `R2_PUBLIC_BASE_URL` (200, contenu
correct). L'autorisation (une commande ne peut recevoir une URL de téléversement que si elle
appartient à l'atelier de l'utilisateur) et la validation du type de fichier sont également
testées en e2e.

**Piège rencontré et corrigé** : les variables d'environnement gérées automatiquement par une
intégration Vercel (Neon, dans ce cas) ne sont pas éditables manuellement dans le tableau de
bord — impossible d'ajouter `&pgbouncer=true` directement sur `DATABASE_URL`. Corrigé côté code
(`PrismaService` ajoute ce paramètre lui-même au démarrage) plutôt que côté configuration.

## 5. Application mobile

L'app mobile continue de pointer vers l'API via `EXPO_PUBLIC_API_URL` (voir `apps/mobile/src/api/client.ts`).
Une fois l'API déployée sur Vercel, définir cette variable sur l'URL Vercel avant de builder l'app
avec EAS Build (non couvert par ce document — décision de mise en boutique/distribution à traiter
séparément).
