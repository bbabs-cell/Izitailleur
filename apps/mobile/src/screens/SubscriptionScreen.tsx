import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { useTheme } from "../theme/ThemeContext";

interface Tier {
  key: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TIERS: Tier[] = [
  {
    key: "free",
    name: "Gratuit",
    description: "Clients, commandes, calendrier et synchronisation illimités pour un seul atelier.",
    icon: "leaf-outline",
  },
  {
    key: "pro",
    name: "Pro",
    description: "Statistiques avancées, export comptable et équipe élargie. Bientôt disponible.",
    icon: "trending-up-outline",
  },
  {
    key: "business",
    name: "Business",
    description: "Plusieurs ateliers, rôles personnalisés et support prioritaire. Bientôt disponible.",
    icon: "business-outline",
  },
];

/**
 * Aucune intégration de paiement n'est configurée : cet écran ne propose donc aucun bouton
 * d'achat ou de changement de palier tant que la facturation réelle n'est pas branchée.
 */
export function SubscriptionScreen() {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>Abonnement</Text>
      <Text style={[typography.body, { color: colors.textSecondary }]}>
        Votre atelier utilise actuellement l'offre Gratuite. Les offres payantes ne sont pas
        encore disponibles.
      </Text>

      {TIERS.map((tier) => (
        <Card key={tier.key} style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Ionicons name={tier.icon} size={22} color={colors.accent} />
            <Text style={[typography.subtitle, { color: colors.textPrimary, flex: 1 }]}>{tier.name}</Text>
            {tier.key === "free" ? <Badge label="Offre actuelle" tone="success" /> : <Badge label="À venir" tone="neutral" />}
          </View>
          <Text style={[typography.body, { color: colors.textSecondary }]}>{tier.description}</Text>
        </Card>
      ))}

      <View
        style={{
          flexDirection: "row",
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.infoSoft,
        }}
      >
        <Ionicons name="information-circle-outline" size={20} color={colors.info} />
        <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
          Aucun paiement n'est traité dans l'application. Cette page sera mise à jour lorsque la
          facturation sera activée pour votre atelier.
        </Text>
      </View>
    </ScrollView>
  );
}
