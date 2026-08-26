import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { notificationsApi, type Notification } from "../api/notifications";
import { NOTIFICATION_ICONS, NOTIFICATION_TONE } from "../domain/notifications";
import { colors, spacing, typography } from "../theme/tokens";

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setNotifications(await notificationsApi.list());
    } catch {
      setError("Impossible de charger les notifications (connexion requise).");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function checkNow() {
    setLoading(true);
    setError(null);
    try {
      setNotifications(await notificationsApi.scan());
    } catch {
      setError("Vérification impossible (connexion requise).");
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      setError("Impossible de marquer cette notification comme lue.");
    }
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>Aucune notification. Tout est sous contrôle. 🎉</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => (!item.read ? markRead(item.id) : undefined)}>
            <Card style={[styles.card, item.read ? styles.cardRead : null]}>
              <View style={styles.headerRow}>
                <Text style={styles.icon}>{NOTIFICATION_ICONS[item.type]}</Text>
                <Text style={styles.title}>{item.title}</Text>
                {!item.read ? <Badge label="Nouveau" tone={NOTIFICATION_TONE[item.type]} /> : null}
              </View>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.caption}>{new Date(item.createdAt).toLocaleString("fr-FR")}</Text>
            </Card>
          </Pressable>
        )}
      />
      <Button label="Vérifier maintenant" variant="secondary" onPress={checkNow} loading={loading} />
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
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    gap: spacing.xs,
  },
  cardRead: {
    opacity: 0.6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
