import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { canViewFinance, type Role } from "@izitailleur/shared";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/I18nContext";
import { Card } from "../components/Card";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "More">;

interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  visible?: boolean;
}

export function MoreScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();
  const { t } = useTranslation();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const canFinance = !!user && canViewFinance(user.role as Role);
  const isAdmin = !!user && (user.role === "OWNER" || user.role === "ADMIN");

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: t("more.workshop"),
      items: [
        { label: "Équipe", icon: "people-outline", onPress: () => navigation.navigate("Team") },
        { label: "Modèles", icon: "shirt-outline", onPress: () => navigation.navigate("Models") },
        { label: "Tissus", icon: "color-palette-outline", onPress: () => navigation.navigate("Fabrics") },
        { label: "Fournisseurs", icon: "cube-outline", onPress: () => navigation.navigate("Suppliers") },
        {
          label: "Problèmes de l'atelier",
          icon: "warning-outline",
          onPress: () => navigation.navigate("Issues"),
        },
        {
          label: "Assistant de l'atelier",
          icon: "sparkles-outline",
          onPress: () => navigation.navigate("Assistant"),
        },
      ],
    },
    {
      title: t("more.finance"),
      items: [
        {
          label: "Argent à récupérer",
          icon: "cash-outline",
          onPress: () => navigation.navigate("Debts"),
          visible: canFinance,
        },
        {
          label: "Statistiques",
          icon: "stats-chart-outline",
          onPress: () => navigation.navigate("FinanceStats"),
          visible: canFinance,
        },
        {
          label: "Dépenses",
          icon: "wallet-outline",
          onPress: () => navigation.navigate("Expenses"),
          visible: canFinance,
        },
      ],
    },
    {
      title: t("more.application"),
      items: [
        { label: "Notifications", icon: "notifications-outline", onPress: () => navigation.navigate("Notifications") },
        { label: "Synchronisation", icon: "sync-outline", onPress: () => navigation.navigate("SyncStatus") },
        { label: "Recherche", icon: "search-outline", onPress: () => navigation.navigate("Search") },
        {
          label: "Paramètres de l'atelier",
          icon: "settings-outline",
          onPress: () => navigation.navigate("WorkshopSettings"),
          visible: isAdmin,
        },
        {
          label: "Abonnement",
          icon: "card-outline",
          onPress: () => navigation.navigate("Subscription"),
          visible: isAdmin,
        },
        { label: "Apparence & langue", icon: "color-wand-outline", onPress: () => navigation.navigate("Settings") },
      ],
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { padding: spacing.lg, gap: spacing.lg }]}
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>{t("more.title")}</Text>

      {sections.map((section) => {
        const visibleItems = section.items.filter((item) => item.visible !== false);
        if (visibleItems.length === 0) return null;
        return (
          <View key={section.title} style={{ gap: spacing.sm }}>
            <Text style={[typography.overline, { color: colors.textMuted }]}>{section.title}</Text>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {visibleItems.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={item.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  style={[
                    styles.row,
                    {
                      padding: spacing.md,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color={colors.accent} />
                  <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        );
      })}

      <TouchableOpacity
        onPress={() => setConfirmingLogout(true)}
        testID="logout-button"
        accessibilityRole="button"
        accessibilityLabel={t("more.logout")}
        style={[
          styles.row,
          {
            padding: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.dangerSoft,
            justifyContent: "center",
          },
        ]}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={[typography.subtitle, { color: colors.danger }]}>{t("more.logout")}</Text>
      </TouchableOpacity>

      <ConfirmDialog
        visible={confirmingLogout}
        title={t("more.logout")}
        description="Vous devrez vous reconnecter avec votre téléphone et votre mot de passe."
        confirmLabel={t("more.logout")}
        destructive
        onConfirm={() => {
          setConfirmingLogout(false);
          logout();
        }}
        onCancel={() => setConfirmingLogout(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
