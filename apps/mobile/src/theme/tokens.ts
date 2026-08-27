import { darkColors } from "./themes";

export { palette } from "./palette";
export { lightColors, darkColors, type ColorTokens } from "./themes";

/** @deprecated use `useTheme().colors` — kept for screens not yet migrated to ThemeProvider. */
export const colors = darkColors;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 } as const;
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const typography = {
  hero: { fontSize: 30, fontWeight: "700" as const },
  title: { fontSize: 24, fontWeight: "700" as const },
  subtitle: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  label: { fontSize: 13, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
  overline: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.6 },
};
