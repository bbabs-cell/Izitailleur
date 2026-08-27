import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { aiApi } from "../api/ai";
import { ApiError } from "../api/client";
import { useThemedStyles } from "../theme/useThemedStyles";

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
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background, padding: t.spacing.lg, gap: t.spacing.md },
    title: { ...t.typography.title, color: t.colors.textPrimary },
    subtitle: { ...t.typography.caption, color: t.colors.textSecondary },
    suggestions: { gap: t.spacing.sm },
    suggestionCard: { padding: t.spacing.md },
    suggestionText: { ...t.typography.body, color: t.colors.accentAlt },
    list: { gap: t.spacing.sm, paddingBottom: t.spacing.md },
    exchangeCard: { gap: t.spacing.xs },
    question: { ...t.typography.subtitle, color: t.colors.textPrimary },
    answer: { ...t.typography.body, color: t.colors.textSecondary },
    inputRow: { flexDirection: "row", alignItems: "flex-end", gap: t.spacing.sm },
    inputField: { flex: 1 },
    error: { ...t.typography.caption, color: t.colors.danger },
  }));

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
            <Pressable key={s} onPress={() => submit(s)} accessibilityRole="button" accessibilityLabel={s}>
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
