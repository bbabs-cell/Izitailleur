# IZITAILLEUR — Feuille de route

Chaque phase suit la méthode : Analyser → Planifier → Implémenter → Tester → Corriger →
Vérifier l'interface → Documenter. On ne passe pas à la phase suivante si la précédente
contient des erreurs critiques non résolues.

- [x] **PHASE 0 — Analyse** : inspection du dépôt (vide), choix d'architecture, documentation
      initiale.
- [x] **PHASE 1 — Fondation** : monorepo pnpm, API NestJS (auth JWT + RBAC, Prisma/PostgreSQL),
      app mobile Expo (navigation, design system, écrans Connexion/Inscription/Accueil).
      Tests réels : 8/8 (API) + 5/5 (mobile).
- [x] **PHASE 2 — Cœur métier** : clients, mensurations (historisées), commandes (référence
      auto-incrémentée, machine à états de statut), tâches, photos, calendrier (avec détection
      de journée chargée). Tests réels : 25/25 (API) + 12/12 (mobile).
- [x] **PHASE 3 — Atelier** : équipe/apprentis (invitation, rôles, RBAC réel), tissus/stock
      (mouvements, alerte stock faible, consommation atomique liée aux commandes), fournisseurs,
      problèmes d'atelier. Tests réels : 44/44 (API) + 15/15 (mobile).
- [x] **PHASE 4 — Finances** : paiements (5 modes), reçus PDF réels (génération + partage),
      vue "argent à récupérer", statistiques financières basées sur les données réelles, accès
      restreint aux rôles autorisés. Tests réels : 54/54 (API) + 17/17 (mobile).
- [x] **PHASE 5 — Offline** : stockage local (SQLite), synchronisation (pull/push) et résolution
      de conflits réelle et testée — scope actuel : Clients et Calendrier (voir
      docs/ARCHITECTURE.md pour le détail honnête de la portée). Tests réels : 63/63 (API,
      dont un scénario de conflit à deux appareils) + 26/26 (mobile, logique pure).
- [x] **PHASE 6 — Notifications** : alertes calculées sur données réelles (rendez-vous, retards,
      dettes, stock faible, tâches, problèmes urgents), résolution automatique, rappels locaux
      sur l'appareil. Push distant non câblé (limite documentée). Tests réels : 70/70 (API) +
      30/30 (mobile).
- [x] **PHASE 7 — IA** : AIService déterministe (décision validée : pas d'appel externe),
      répond aux 6 questions du cahier des charges à partir de données réelles, permissions
      respectées. Tests réels : 81/81 (API).
- [x] **PHASE 8 — Qualité** : sécurité durcie (helmet, anti-brute-force testé), cas limite
      « date passée » ajouté et testé, garde-fous de performance, code vérifié sans import
      inutilisé, documentation manquante complétée (DATABASE.md, SECURITY.md, TESTING.md).
      Tests réels : 83/83 (API) + 30/30 (mobile). **Toutes les phases du projet sont
      terminées.**

Chaque phase terminée fait l'objet d'un rapport : fonctionnalités créées, fichiers principaux,
tests exécutés, résultats, erreurs corrigées, points restants.

## Après la Phase 8 — évolutions

- [x] **Tableau de bord de l'accueil** : endpoint `GET /dashboard` agrégeant les vraies données
      de l'atelier (Aujourd'hui, Urgent, Argent, Stock, Équipe), sections Argent/Équipe masquées
      pour les rôles non autorisés (`canViewFinance`). Écran d'accueil mobile reconstruit pour
      consommer cet endpoint. Tests réels : 92/92 (API) + 30/30 (mobile).
- [x] **Mode hors connexion étendu aux commandes et aux tâches** : création de commande hors
      connexion (référence et stock validés à la synchronisation), changement de statut de
      commande et de tâche hors connexion, conflits détectés et résolubles depuis l'écran
      Synchronisation. Tests réels : 17/17 (sync e2e, API) + suite complète 100/100 (API),
      typecheck mobile propre.
- [x] **Reçus/factures plus poussés** : facture PDF complète par commande (récapitulatif prix,
      acompte, historique des paiements, solde), export CSV réel des paiements (filtrable par
      date) pour la comptabilité, message de pied de page personnalisable par atelier
      (`GET/PATCH /workshop`, réservé OWNER/ADMIN) repris sur les reçus et les factures. Tests
      réels : 17/17 (payments/finance e2e, incluant contenu réel du PDF décodé). Suite API
      complète 107/107 (deux exécutions consécutives, idempotent).
- [x] **Infrastructure de production câblée** (hébergement, sauvegardes, stockage des photos,
      secrets), code et tests : point d'entrée serverless Vercel testé de bout en bout,
      anti-brute-force basculé sur un stockage Redis partagé quand `REDIS_URL` est défini, upload
      de photos vers Cloudflare R2 (présignature testée réellement). Tests réels : 115/115 (API,
      deux exécutions consécutives, idempotent) + 30/30 (mobile).
- [x] **Mise en production réelle (26–27/08/2026)** : API déployée et vérifiée en conditions
      réelles sur Vercel + base Neon (Frankfurt) + Redis Upstash (Frankfurt) + Cloudflare R2 —
      inscription, connexion, `/dashboard` authentifié, création de commande et anti-brute-force
      (12 tentatives de connexion invalides → 10× 401 puis 2× 429) testés directement contre
      l'API de production. Upload de photo testé de bout en bout : présignature → PUT réel vers
      R2 → photo accessible publiquement (200). Deux bugs réels trouvés et corrigés pendant la
      mise en place : `pgbouncer=true` manquant sur la connexion poolée Neon (transactions Prisma
      en échec), et une migration Prisma (`receiptFooterMessage`) non appliquée en production.
      Voir docs/DEPLOYMENT.md pour la marche à suivre détaillée et les pièges rencontrés.
      Les quatre décisions d'infrastructure (hébergement, sauvegardes, stockage des photos,
      secrets) sont en place et vérifiées.
- [x] **Refonte complète UI/UX mobile (27/08/2026)** : nouveau système de design (palette
      colorée indigo/turquoise, thème clair/sombre/auto — le clair n'est jamais blanc pur),
      navigation par onglets (Accueil/Commandes/Calendrier/Clients/Plus) remplaçant la pile
      unique, Splash + Onboarding, recherche globale, architecture i18n (FR complet, EN en
      place, sélecteur fonctionnel), écran de reçu dédié, wizard de création de commande en
      9 étapes, écran Abonnement (architecture seule, aucun paiement simulé), bibliothèque de
      modèles/patrons (nouvelle entité `GarmentModel`, full-stack), personnalisation des types
      de mesures par atelier (`Workshop.measurementFields`, full-stack), micro-interactions
      (Toast + retour haptique), squelettes de chargement, `ConfirmDialog` (confirmation avant
      déconnexion), passe d'accessibilité (rôles/labels sur tous les éléments tactiles). Les 26
      écrans existants migrés sur le nouveau thème. Deux migrations Prisma (`add_garment_model`,
      `add_workshop_measurement_fields`) déployées en production et vérifiées.
- [x] **Audit de sécurité RBAC (27/08/2026)** : deux fuites réelles de données financières vers
      les rôles sans accès finance (ex. apprenti) trouvées et corrigées — `GET /orders`,
      `GET /orders/:id` et `GET /sync/pull` renvoyaient `price`/`deposit` de chaque commande sans
      filtrage par rôle ; `GET /fabrics`, `GET /fabrics/:id`, `GET /fabrics/low-stock` et
      `POST /fabrics/:id/movements` renvoyaient `purchasePrice` (coût fournisseur, donc la marge
      de l'atelier) de la même façon. Corrigé via `redactOrderFinancials`/`redactFabricFinancials`
      (`apps/api/src/common/redact-financials.ts`), avec tests de non-régression e2e vérifiant
      qu'un apprenti reçoit bien des valeurs nulles sur ces chemins. Reste du schéma audité :
      aucune autre fuite du même type trouvée (paiements/reçus/factures/finances déjà
      correctement verrouillés par rôle).
