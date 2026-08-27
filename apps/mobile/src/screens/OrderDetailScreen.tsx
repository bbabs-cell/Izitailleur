import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  canTransitionOrderStatus,
  canViewFinance,
  ORDER_STATUSES,
  type OrderStatus,
  type Role,
} from "@izitailleur/shared";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { ordersRepo, type LocalOrder } from "../offline/ordersRepo";
import { tasksRepo, type LocalTask } from "../offline/tasksRepo";
import { useSync } from "../offline/SyncContext";
import { orderImagesApi, type OrderImage } from "../api/orderImages";
import { ApiError } from "../api/client";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, isOrderLate } from "../domain/orderStatus";
import { useAuth } from "../auth/AuthContext";
import { useThemedStyles } from "../theme/useThemedStyles";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "OrderDetail">;

/**
 * Source de données : SQLite local (offline-first). Les changements de statut (commande et
 * tâches) s'écrivent immédiatement en local et se synchronisent en arrière-plan.
 */
export function OrderDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { status: syncStatus } = useSync();
  const { orderId } = route.params;
  const [order, setOrder] = useState<LocalOrder | null>(null);
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [images, setImages] = useState<OrderImage[]>([]);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const styles = useThemedStyles((t) => ({
    container: { flexGrow: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.sm },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    section: { ...t.typography.subtitle, color: t.colors.textPrimary, marginTop: t.spacing.md },
    card: { gap: t.spacing.xs },
    taskCard: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
    checkbox: { fontSize: 18, color: t.colors.accent },
    taskDone: { color: t.colors.textSecondary, textDecorationLine: "line-through" },
    label: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: t.spacing.xs },
    body: { ...t.typography.body, color: t.colors.textPrimary },
    balanceDue: { color: t.colors.warning },
    balancePaid: { color: t.colors.success },
    row: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm },
    error: { ...t.typography.caption, color: t.colors.danger },
    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm },
    photo: { width: 96, height: 96, borderRadius: 8, backgroundColor: t.colors.surfaceElevated },
  }));

  const load = useCallback(async () => {
    try {
      const [loadedOrder, loadedTasks] = await Promise.all([
        ordersRepo.get(orderId),
        tasksRepo.listByOrder(orderId),
      ]);
      if (!loadedOrder) {
        setError("Commande introuvable localement.");
        return;
      }
      setOrder(loadedOrder);
      setTasks(loadedTasks);
    } catch {
      setError("Impossible de charger cette commande.");
    }
    try {
      // Les photos ne sont pas encore synchronisées hors connexion (voir ARCHITECTURE.md) :
      // leur liste nécessite une connexion, avec un message clair si elle est indisponible.
      setImages(await orderImagesApi.list(orderId));
      setImagesError(null);
    } catch {
      setImagesError("Photos disponibles uniquement en ligne (connexion requise).");
    }
  }, [orderId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation, load]);

  useEffect(() => {
    if (syncStatus === "idle") load();
  }, [syncStatus, load]);

  async function moveTo(status: OrderStatus) {
    if (!order) return;
    setUpdating(true);
    setError(null);
    try {
      await ordersRepo.updateStatus(order.id, status);
      await load();
    } catch {
      setError("Impossible d'enregistrer ce changement de statut sur l'appareil.");
    } finally {
      setUpdating(false);
    }
  }

  async function addPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setImagesError("Autorisation refusée pour accéder aux photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const contentType = asset.mimeType ?? "image/jpeg";

    setUploading(true);
    setImagesError(null);
    try {
      const { uploadUrl, publicUrl } = await orderImagesApi.presignUpload(orderId, contentType);
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
        httpMethod: "PUT",
        headers: { "Content-Type": contentType },
      });
      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error("Échec de l'envoi de la photo au stockage.");
      }
      await orderImagesApi.attach(orderId, publicUrl);
      setImages(await orderImagesApi.list(orderId));
    } catch (e) {
      setImagesError(
        e instanceof ApiError && e.status === 503
          ? "Le stockage des photos n'est pas configuré sur ce serveur."
          : "Impossible d'ajouter cette photo.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    try {
      await tasksRepo.updateStatus(taskId, nextStatus);
      await load();
    } catch {
      setError("Impossible de mettre à jour la tâche.");
    }
  }

  if (error && !order) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>⚠️ {error}</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Chargement…</Text>
      </View>
    );
  }

  const status = order.status as OrderStatus;
  const late = isOrderLate(order.dueDate, status);
  const balance = order.price - order.deposit;
  const nextStatuses = ORDER_STATUSES.filter((s) => canTransitionOrderStatus(status, s));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{order.reference ? `#${order.reference}` : "En attente de synchro"}</Text>
        <Badge label={ORDER_STATUS_LABELS[status]} tone={ORDER_STATUS_TONE[status]} />
      </View>
      {late ? <Badge label="Urgent — en retard" tone="danger" /> : null}
      {order.dirty ? <Badge label="Non synchronisé" tone="info" /> : null}
      {order.conflict ? <Badge label="Conflit à résoudre (voir Synchronisation)" tone="danger" /> : null}

      <Card style={styles.card}>
        <Text style={styles.label}>CLIENT</Text>
        <Text style={styles.body}>
          {order.customerFirstName} {order.customerLastName}
        </Text>
        <Text style={styles.label}>MODÈLE</Text>
        <Text style={styles.body}>{order.modelName}</Text>
        {order.fabricDescription ? (
          <>
            <Text style={styles.label}>TISSU</Text>
            <Text style={styles.body}>{order.fabricDescription}</Text>
          </>
        ) : null}
        <Text style={styles.label}>DATE LIMITE</Text>
        <Text style={styles.body}>{new Date(order.dueDate).toLocaleDateString("fr-FR")}</Text>
        {order.instructions ? (
          <>
            <Text style={styles.label}>INSTRUCTIONS</Text>
            <Text style={styles.body}>{order.instructions}</Text>
          </>
        ) : null}
        <Text style={styles.label}>PAIEMENT</Text>
        <Text style={styles.body}>
          {order.price.toLocaleString("fr-FR")} FCFA — acompte {order.deposit.toLocaleString("fr-FR")} FCFA
        </Text>
        <Text style={[styles.body, balance > 0 ? styles.balanceDue : styles.balancePaid]}>
          {balance > 0
            ? `Solde restant (acompte uniquement) : ${balance.toLocaleString("fr-FR")} FCFA`
            : "Acompte couvrant le prix total"}
        </Text>
      </Card>

      {user && canViewFinance(user.role as Role) ? (
        <Button
          label="Voir les paiements et reçus"
          variant="secondary"
          onPress={() => navigation.navigate("OrderPayments", { orderId: order.id })}
        />
      ) : null}

      <Text style={styles.section}>Progression</Text>
      <View style={styles.row}>
        {nextStatuses.length === 0 ? (
          <Text style={styles.body}>Aucune transition possible depuis ce statut.</Text>
        ) : (
          nextStatuses.map((status) => (
            <Button
              key={status}
              label={`→ ${ORDER_STATUS_LABELS[status]}`}
              variant="secondary"
              onPress={() => moveTo(status)}
              loading={updating}
            />
          ))
        )}
      </View>

      <Text style={styles.section}>Tâches</Text>
      {tasks.length === 0 ? (
        <Text style={styles.body}>Aucune tâche pour cette commande.</Text>
      ) : (
        tasks.map((task) => (
          <Pressable key={task.id} onPress={() => toggleTask(task.id, task.status)}>
            <Card style={styles.taskCard}>
              <Text style={styles.checkbox}>{task.status === "DONE" ? "☑" : "☐"}</Text>
              <Text style={[styles.body, task.status === "DONE" ? styles.taskDone : null]}>
                {task.title}
              </Text>
              {task.dirty ? <Badge label="Non synchronisé" tone="info" /> : null}
            </Card>
          </Pressable>
        ))
      )}

      <Text style={styles.section}>Photos</Text>
      {imagesError ? <Text style={styles.error}>⚠️ {imagesError}</Text> : null}
      {images.length > 0 ? (
        <View style={styles.photoGrid}>
          {images.map((image) => (
            <Image key={image.id} source={{ uri: image.url }} style={styles.photo} />
          ))}
        </View>
      ) : !imagesError ? (
        <Text style={styles.body}>Aucune photo pour le moment.</Text>
      ) : null}
      <Button
        label={uploading ? "Envoi…" : "📷 Ajouter une photo"}
        variant="secondary"
        onPress={addPhoto}
        loading={uploading}
      />

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
    </ScrollView>
  );
}

