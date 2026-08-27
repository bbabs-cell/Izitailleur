import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { notificationsApi, type Notification } from "../api/notifications";
import { NOTIFICATION_ICONS, NOTIFICATION_TONE } from "../domain/notifications";
import { useThemedStyles } from "../theme/useThemedStyles";

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md, flexGrow: 1 },
    card: { gap: t.spacing.xs },
    cardRead: { opacity: 0.6 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
    icon: { fontSize: 18 },
    title: { ...t.typography.subtitle, color: t.colors.textPrimary, flexShrink: 1 },
    body: { ...t.typography.body, color: t.colors.textSecondary },
    caption: { ...t.typography.caption, color: t.colors.textSecondary },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

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
          !loading ? (
            <EmptyState icon="notifications-outline" title="Aucune notification" description="Tout est sous contrôle." />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityState={{ selected: item.read }}
            onPress={() => (!item.read ? markRead(item.id) : undefined)}
          >
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
