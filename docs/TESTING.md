# IZITAILLEUR — Tests

## État actuel (fin Phase 8)

| Paquet | Tests | Outils | Cible |
|---|---|---|---|
| `apps/api` | 83/83 ✅ | Jest + Supertest | **Vraie base PostgreSQL locale** (aucun mock de base de données) |
| `apps/mobile` | 30/30 ✅ | Jest + Testing Library (`jest-expo`) | Composants + logique métier pure |

Aucun test n'est simulé ou déclaré passant sans avoir réellement été exécuté. Chaque rapport de
phase de ce projet indique les résultats de la dernière exécution réelle.

## Comment exécuter

```bash
# API — nécessite PostgreSQL démarré et DATABASE_URL configuré (voir apps/api/.env.example)
cd apps/api && pnpm test

# Mobile
cd apps/mobile && pnpm test
```

Les suites API sont idempotentes : deux exécutions consécutives sur la même base produisent le
même résultat (vérifié à chaque phase avant commit).

## Répartition des tests API (13 suites)

`auth`, `customers`, `orders`, `appointments`, `employees`, `fabrics`, `suppliers`, `issues`,
`payments` (+ reçus), `sync`, `notifications`, `ai`, `throttle`.

## Cas limites couverts (section 36 du cahier des charges)

| Cas limite | Où |
|---|---|
| Paiement supérieur au prix / au solde restant | `payments.e2e-spec.ts` |
| Stock de tissu insuffisant | `fabrics.e2e-spec.ts`, `orders.e2e-spec.ts` |
| Commande sans client (client inexistant) | `orders.e2e-spec.ts` |
| Date limite déjà passée | `orders.e2e-spec.ts` |
| Utilisateur sans permission (finances, gestion d'équipe) | `payments.e2e-spec.ts`, `employees.e2e-spec.ts`, `ai.e2e-spec.ts` |
| Suppression (soft-delete, isolation post-suppression) | `customers.e2e-spec.ts`, `suppliers.e2e-spec.ts` |
| Conflit de synchronisation (deux appareils) | `sync.e2e-spec.ts` |
| Rejeu idempotent d'une mutation déjà appliquée | `sync.e2e-spec.ts` |
| Transition de statut de commande invalide | `orders.e2e-spec.ts` |
| Un employé ne peut pas se retirer lui-même | `employees.e2e-spec.ts` |
| Limitation de débit (anti-brute-force) | `throttle.e2e-spec.ts` |

## Limites connues et assumées

- Le moteur de synchronisation SQLite/réseau côté mobile (`syncEngine.ts`, `SyncContext.tsx`)
  n'a pas pu être exercé par un test automatisé dans cet environnement (pas d'émulateur/
  appareil) — seule sa logique de décision pure est testée unitairement. À vérifier
  manuellement avant mise en production.
- Les notifications locales natives (`expo-notifications`) ne sont testées que sur leur calcul
  pur (heure de déclenchement) ; l'appel réel à l'API native de l'appareil n'est pas testé
  automatiquement pour la même raison.
- Pas encore de tests de charge/performance (hors périmètre de cette phase).
