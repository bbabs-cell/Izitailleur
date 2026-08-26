import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createIssueSchema, ISSUE_CATEGORIES, PRIORITIES, type IssueCategory, type Priority } from "@izitailleur/shared";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { Badge } from "../components/Badge";
import { issuesApi } from "../api/issues";
import { ApiError } from "../api/client";
import { ISSUE_CATEGORY_LABELS } from "../domain/issues";
import { colors, spacing, typography } from "../theme/tokens";
import type { AppStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "IssueForm">;

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Basse",
  NORMAL: "Normale",
  HIGH: "Haute",
  URGENT: "Urgente",
};

export function IssueFormScreen({ navigation }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IssueCategory>("OTHER");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = createIssueSchema.safeParse({
      title,
      description: description || undefined,
      category,
      priority,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
      return;
    }
    setLoading(true);
    try {
      await issuesApi.create(parsed.data);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible de signaler ce problème.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Signaler un problème</Text>
      <TextField label="Titre" value={title} onChangeText={setTitle} placeholder="Machine en panne" />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline />

      <Text style={styles.label}>Catégorie</Text>
      <View style={styles.row}>
        {ISSUE_CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => setCategory(c)}>
            <Badge label={ISSUE_CATEGORY_LABELS[c]} tone={category === c ? "success" : "neutral"} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Priorité</Text>
      <View style={styles.row}>
        {PRIORITIES.map((p) => (
          <Pressable key={p} onPress={() => setPriority(p)}>
            <Badge label={PRIORITY_LABELS[p]} tone={priority === p ? "warning" : "neutral"} />
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}
      <Button label="Signaler" onPress={handleSubmit} loading={loading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
