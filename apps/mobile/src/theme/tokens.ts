export const colors = {
  background: "#0F172A",
  surface: "#1B2540",
  surfaceElevated: "#242F52",
  border: "#33406B",
  textPrimary: "#F4F6FB",
  textSecondary: "#A6B0D3",
  accent: "#6C5CE7",
  accentAlt: "#3ADCC7",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#38BDF8",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: "700" as const },
  subtitle: { fontSize: 16, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 13, fontWeight: "400" as const },
};
