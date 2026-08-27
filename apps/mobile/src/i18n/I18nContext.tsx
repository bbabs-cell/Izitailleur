import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { fr, type TranslationKeys } from "./translations/fr";
import { en } from "./translations/en";

export type Locale = "fr" | "en";

const LOCALE_KEY = "izitailleur_locale";
const DICTIONARIES: Record<Locale, TranslationKeys> = { fr, en };
export const AVAILABLE_LOCALES: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

type Dict = typeof fr;
type Path<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Path<T[K], `${Prefix}${K}.`>;
}[keyof T & string];
export type TranslationKey = Path<Dict>;

function resolve(dict: TranslationKeys, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === "object" && segment in acc) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : path;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => String(vars[key] ?? match));
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "fr",
  setLocale: () => undefined,
  t: (key) => resolve(fr, key),
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    SecureStore.getItemAsync(LOCALE_KEY)
      .then((stored) => {
        if (stored === "fr" || stored === "en") setLocaleState(stored);
      })
      .catch(() => undefined);
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    SecureStore.setItemAsync(LOCALE_KEY, next).catch(() => undefined);
  };

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTIONARIES[locale];
    return {
      locale,
      setLocale,
      t: (key, vars) => interpolate(resolve(dict, key), vars),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}
