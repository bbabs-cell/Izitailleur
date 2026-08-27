import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { darkColors, lightColors, type ColorTokens } from "./themes";
import { radius, spacing, typography } from "./tokens";

export type ThemeMode = "light" | "dark" | "auto";

const THEME_MODE_KEY = "izitailleur_theme_mode";

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: "light" | "dark";
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  setMode: (mode: ThemeMode) => void;
}

const defaultContextValue: ThemeContextValue = {
  mode: "dark",
  scheme: "dark",
  colors: darkColors,
  spacing,
  radius,
  typography,
  setMode: () => undefined,
};

const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(THEME_MODE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "auto") {
          setModeState(stored);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(THEME_MODE_KEY, next).catch(() => undefined);
  };

  const scheme: "light" | "dark" = mode === "auto" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      scheme,
      colors: scheme === "dark" ? darkColors : lightColors,
      spacing,
      radius,
      typography,
      setMode,
    }),
    [mode, scheme],
  );

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
