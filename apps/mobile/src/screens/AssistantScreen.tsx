import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { aiApi } from "../api/ai";
import { ApiError } from "../api/client";
import { colors, spacing, typography } from "../theme/tokens";

interface Exchange {
  id: string;
  question: string;
  answer: string;
}

const SUGGESTIONS = [
  "Qu'est-ce que je dois faire aujourd'hui ?",
  "Quelles commandes sont en retard ?",
  "Qui me doit de l'argent ?",
  "Quel tissu va bientôt manquer ?",
];

export function AssistantScreen() {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    try {
      const result = await aiApi.ask(trimmed);
      setExchanges((prev) => [{ id: `${Date.now()}`, question: trimmed, answer: result.answer }, ...prev]);
      setQuestion("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible d'obtenir une réponse.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assistant de l'atelier</Text>
      <Text style={styles.subtitle}>
        Répond uniquement à partir des données réelles de votre atelier — jamais de réponse
        inventée.
      </Text>

      {exchanges.length === 0 ? (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} onPress={() => submit(s)}>
              <Card style={styles.suggestionCard}>
                <Text style={styles.suggestionText}>{s}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <FlatList
          data={exchanges}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.exchangeCard}>
              <Text style={styles.question}>{item.question}</Text>
              <Text style={styles.answer}>{item.answer}</Text>
            </Card>
          )}
        />
      )}

      {error ? <Text style={styles.error}>⚠️ {error}</Text> : null}

      <View style={styles.inputRow}>
        <View style={styles.inputField}>
          <TextField
            label="Posez une question"
            value={question}
            onChangeText={setQuestion}
            placeholder="Qui travaille sur la commande #0248 ?"
            onSubmitEditing={() => submit(question)}
          />
        </View>
        <Button label="Demander" onPress={() => submit(question)} loading={loading} />
      </View>
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
    ...typography.caption,
    color: colors.textSecondary,
  },
  suggestions: {
    gap: spacing.sm,
  },
  suggestionCard: {
    padding: spacing.md,
  },
  suggestionText: {
    ...typography.body,
    color: colors.accentAlt,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  exchangeCard: {
    gap: spacing.xs,
  },
  question: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  answer: {
    ...typography.body,
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  inputField: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
