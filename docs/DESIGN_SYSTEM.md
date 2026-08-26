# IZITAILLEUR — Design System (base initiale)

Ce document sera enrichi en PHASE 1 (thème, composants) avec des exemples concrets. Il pose ici
les principes non négociables définis dans les instructions du projet.

## Principes

- Pas de grands écrans blancs génériques, pas d'interface froide.
- Identité visuelle forte, surfaces avec profondeur (pas de simples cartes blanches partout).
- Contraste et lisibilité excellents avant tout.
- Une information critique n'est jamais communiquée par la couleur seule : toujours
  **couleur + icône + texte**.
  Exemple : commande urgente → 🔴 couleur + ⚠️ icône + libellé « Urgent ».

## Palette (à explorer, usage contextuel — pas uniforme)

Bleu nuit, ardoise, indigo, violet, turquoise, vert, orange, rouge.

Chaque couleur a un rôle sémantique (à figer en Phase 1) :
- Neutre/fond : bleu nuit / ardoise
- Accent principal : indigo / violet
- Succès / paiement reçu : vert
- Attention / urgence : orange
- Erreur / retard critique : rouge
- Information secondaire : turquoise

## Icônes

Une seule bibliothèque cohérente (proposition : `lucide-react-native`), taille et style
uniformes, sens toujours explicite.

## Animations

- Courtes, jamais lourdes.
- Utilisées pour : transitions d'écran, apparition de cartes, changement de statut, validation
  de tâche, confirmation de paiement, feedback de succès, suppression avec confirmation.
- Une option de réduction des animations doit être prévue (accessibilité / appareils modestes).

## Accessibilité

- Contraste conforme, taille des cibles tactiles adaptée, labels explicites, navigation claire.

## Responsive

Aucune interface ne doit dépendre d'une taille d'écran spécifique (petits téléphones → tablettes).

*Ce document sera complété avec les tokens de couleur exacts, la typographie et les composants
de base au démarrage de la PHASE 1.*
