import { canViewFinance, type Role } from "@izitailleur/shared";

/**
 * Le prix et l'acompte d'une commande sont des données financières : un rôle sans accès aux
 * finances (ex. apprenti) ne doit jamais les recevoir, que ce soit via l'API REST des commandes
 * ou via la synchronisation hors connexion (/sync/pull) qui alimente la base SQLite locale.
 */
export function redactOrderFinancials<T extends { price: number; deposit: number }>(
  order: T,
  role: Role,
): T {
  if (canViewFinance(role)) return order;
  return { ...order, price: 0, deposit: 0 };
}

/**
 * Le prix d'achat d'un tissu est le coût réel payé au fournisseur (donc la marge de l'atelier) :
 * même logique que redactOrderFinancials, appliquée à /fabrics.
 */
export function redactFabricFinancials<T extends { purchasePrice: number | null }>(
  fabric: T,
  role: Role,
): T {
  if (canViewFinance(role)) return fabric;
  return { ...fabric, purchasePrice: null };
}
