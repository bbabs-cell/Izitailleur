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
