import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "./ThemeContext";

type Theme = ReturnType<typeof useTheme>;

/**
 * Mutualise le pattern useTheme() + StyleSheet.create(...) pour éviter de recréer
 * l'objet de styles à chaque rendu tout en restant réactif aux changements de thème.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}
