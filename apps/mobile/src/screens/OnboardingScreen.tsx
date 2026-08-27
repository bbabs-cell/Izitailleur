import { useRef, useState } from "react";
import { Dimensions, FlatList, StyleSheet, Text, View, type ViewToken } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/I18nContext";
import { Button } from "../components/Button";

interface Slide {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    key: "clients",
    icon: "people-outline",
    title: "Vos clients, toujours à portée de main",
    description: "Fiches clients, mensurations et historique de commandes centralisés.",
  },
  {
    key: "orders",
    icon: "shirt-outline",
    title: "Suivez chaque commande",
    description: "De la prise de mesure à la livraison, ne perdez plus le fil de votre atelier.",
  },
  {
    key: "offline",
    icon: "cloud-offline-outline",
    title: "Fonctionne même sans connexion",
    description: "Continuez à travailler hors ligne, la synchronisation se fait automatiquement.",
  },
];

const { width } = Dimensions.get("window");

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { colors, spacing, radius, typography } = useTheme();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const handleViewableChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const isLast = index === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: colors.accentSoft, borderRadius: radius.pill },
              ]}
            >
              <Ionicons name={item.icon} size={56} color={colors.accent} />
            </View>
            <Text style={[typography.title, styles.title, { color: colors.textPrimary }]}>
              {item.title}
            </Text>
            <Text style={[typography.body, styles.description, { color: colors.textSecondary }]}>
              {item.description}
            </Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.key}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? colors.accent : colors.border,
                width: i === index ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.footer, { padding: spacing.lg, gap: spacing.sm }]}>
        <Button
          label={isLast ? t("onboarding.start") : t("onboarding.next")}
          onPress={() => {
            if (isLast) {
              onDone();
            } else {
              listRef.current?.scrollToIndex({ index: index + 1 });
            }
          }}
        />
        {!isLast ? <Button label={t("onboarding.skip")} variant="ghost" onPress={onDone} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    alignSelf: "center",
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {},
});
