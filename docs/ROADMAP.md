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
- [ ] **PHASE 5 — Offline** : stockage local, synchronisation, gestion des conflits.
- [ ] **PHASE 6 — Notifications** : rappels, alertes, notifications.
- [ ] **PHASE 7 — IA** : AIService, contexte sécurisé, premières commandes IA.
- [ ] **PHASE 8 — Qualité** : tests, optimisation, sécurité, accessibilité, UX, responsive,
      nettoyage du code.

Chaque phase terminée fait l'objet d'un rapport : fonctionnalités créées, fichiers principaux,
tests exécutés, résultats, erreurs corrigées, points restants.
