import { palette } from "./palette";

export interface ColorTokens {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  accentAlt: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  shadow: string;
}

/**
 * Le mode clair ne doit jamais être blanc pur : fond et surfaces sont
 * légèrement teintés indigo pour garder l'identité colorée d'IZITAILLEUR.
 */
export const lightColors: ColorTokens = {
  background: palette.slateLight[50],
  backgroundAlt: palette.slateLight[100],
  surface: "#FAFBFE",
  surfaceElevated: palette.slateLight[100],
  border: palette.slateLight[200],
  borderStrong: palette.slateLight[500],
  textPrimary: palette.slateLight[900],
  textSecondary: palette.slateLight[600],
  textMuted: palette.slateLight[500],
  textInverse: "#FFFFFF",
  accent: palette.indigo[600],
  accentAlt: palette.turquoise[600],
  accentSoft: palette.indigo[50],
  success: palette.green[600],
  successSoft: palette.green[100],
  warning: palette.orange[600],
  warningSoft: palette.orange[100],
  danger: palette.red[600],
  dangerSoft: palette.red[100],
  info: palette.blue[600],
  infoSoft: palette.blue[100],
  overlay: "rgba(27, 31, 59, 0.5)",
  shadow: "rgba(27, 31, 59, 0.12)",
};

export const darkColors: ColorTokens = {
  background: palette.slateDark[50],
  backgroundAlt: palette.slateDark[100],
  surface: palette.slateDark[200],
  surfaceElevated: palette.slateDark[300],
  border: palette.slateDark[400],
  borderStrong: palette.slateDark[500],
  textPrimary: palette.slateDark[900],
  textSecondary: palette.slateDark[600],
  textMuted: palette.slateDark[500],
  textInverse: palette.slateDark[50],
  accent: palette.indigo[500],
  accentAlt: palette.turquoise[500],
  accentSoft: "#2A2359",
  success: palette.green[500],
  successSoft: palette.green[900],
  warning: palette.orange[500],
  warningSoft: palette.orange[900],
  danger: palette.red[500],
  dangerSoft: palette.red[900],
  info: palette.blue[500],
  infoSoft: palette.blue[900],
  overlay: "rgba(5, 8, 20, 0.6)",
  shadow: "rgba(0, 0, 0, 0.4)",
};
