# IZITAILLEUR — Base de données

Schéma géré par Prisma (`apps/api/prisma/schema.prisma`), PostgreSQL. Toutes les migrations
sont versionnées dans `apps/api/prisma/migrations/`.

## Modèles (17)

| Modèle | Rôle |
|---|---|
| `Workshop` | Atelier — racine de l'isolation multi-tenant, porte les compteurs (`orderSequence`, `receiptSequence`) |
| `User` | Membre de l'atelier (propriétaire, admin, responsable, tailleur, coupeur, apprenti, finition, livreur) |
| `Customer` | Client de l'atelier |
| `MeasurementProfile` | Profil de mensurations d'un client (ex: « Boubou standard ») |
| `Measurement` | Une prise de mesure — historisée, jamais écrasée (nouvelle ligne à chaque mesure) |
| `Order` | Commande — objet central, relié à client, tissu, responsable, mensurations |
| `OrderStatusChange` | Historique des changements de statut d'une commande |
| `OrderImage` | Photo associée à une commande |
| `OrderTask` | Tâche de la fiche de travail d'une commande |
| `Appointment` | Rendez-vous (calendrier) |
| `Supplier` | Fournisseur de tissu |
| `Fabric` | Tissu en stock |
| `FabricMovement` | Mouvement de stock (entrée/sortie/ajustement), historique |
| `WorkshopIssue` | Problème d'atelier (14 catégories) |
| `Payment` | Paiement enregistré sur une commande |
| `Receipt` | Reçu généré pour un paiement, numérotation séquentielle par atelier |
| `Notification` | Alerte générée par le système, unique par (atelier, type, entité liée) |

## Principes de conception

- **Isolation stricte par atelier** : toute requête est filtrée par `workshopId` au niveau
  service — jamais uniquement côté client. Vérifié par les tests d'isolation multi-ateliers
  (`customers.e2e-spec.ts`).
- **Suppression douce** (`deletedAt`) sur les entités que l'utilisateur peut supprimer
  (clients, commandes, fournisseurs, tissus, rendez-vous, employés...) — jamais de perte de
  données réelle, jamais de suppression physique accidentelle.
- **Historisation** plutôt qu'écrasement pour les données sensibles : mensurations
  (`Measurement`), statuts de commande (`OrderStatusChange`), mouvements de stock
  (`FabricMovement`).
- **Identifiants stables** : UUID v4 partout, y compris pour les enregistrements créés hors
  ligne côté mobile (généré côté client avant toute synchronisation — voir la section
  synchronisation d'ARCHITECTURE.md).
- **Références métier lisibles** distinctes de l'identifiant technique : `Order.reference`
  (`#0001`, `#0002`...) et `Receipt.number` (`R-00001`...), tous deux séquentiels par atelier
  et générés dans une transaction avec verrouillage implicite via l'incrément atomique du
  compteur du `Workshop`.
- **Argent en entiers** (FCFA n'a pas de sous-unité) : `price`, `deposit`, `amount` sont des
  `Int`, jamais des flottants — évite les erreurs d'arrondi sur les montants.
