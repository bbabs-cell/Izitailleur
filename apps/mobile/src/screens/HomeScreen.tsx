import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { useAuth } from "../auth/AuthContext";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  MANAGER: "Responsable",
  TAILOR: "Tailleur",
  CUTTER: "Coupeur",
  APPRENTICE: "Apprenti",
  FINISHER: "Finition",
  DELIVERY: "Livreur",
};

export function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bonjour, {user?.fullName?.split(" ")[0]}</Text>
      <Text style={styles.subtitle}>{user?.workshop.name}</Text>

      <Card style={styles.card}>
        <Badge label={ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? ""} tone="info" />
        <Text style={styles.body}>
          Le tableau de bord (urgences, argent, stock) arrive avec les modules Finances et
          Atelier. En attendant, gérez vos clients, commandes et rendez-vous ci-dessous.
        </Text>
      </Card>

      <Button label="Clients" onPress={() => navigation.navigate("Customers")} />
      <Button label="Commandes" onPress={() => navigation.navigate("Orders")} />
      <Button label="Calendrier" onPress={() => navigation.navigate("Calendar")} />

      <Button label="Se déconnecter" variant="secondary" onPress={logout} testID="logout-button" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
