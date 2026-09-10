"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translateCopy } from "./lib/somali.mjs";

type Locale = "en" | "so";
type Theme = "light" | "dark";
const Preferences = createContext({
  locale: "en" as Locale,
  theme: "light" as Theme,
  setLocale: (_: Locale) => {},
  setTheme: (_: Theme) => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const language = localStorage.getItem("somway-locale");
      const appearance = localStorage.getItem("somway-theme");
      if (language === "so" || language === "en") setLocale(language);
      if (appearance === "dark" || appearance === "light") setTheme(appearance);
    } catch { /* Preferences still work when browser storage is unavailable. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("somway-locale", locale);
      localStorage.setItem("somway-theme", theme);
    } catch { /* Keep the selected settings for this visit. */ }
  }, [locale, theme, ready]);
  return <Preferences.Provider value={{ locale, theme, setLocale, setTheme }}>{children}</Preferences.Provider>;
}

export const usePreferences = () => useContext(Preferences);
export function useTranslation() {
  const { locale } = usePreferences();
  return (text: string, values?: unknown[]) => translateCopy(text, locale, values) as string;
}

export function PreferenceControls() {
  const { locale, theme, setLocale, setTheme } = usePreferences();
  const tr = useTranslation();
  return <div className="workspace-preferences" aria-label={tr("Workspace preferences")}>
    <div className="top-preference" role="group" aria-label={tr("Language")}>
      <button type="button" className={locale === "en" ? "selected" : ""} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>English</button>
      <button type="button" className={locale === "so" ? "selected" : ""} aria-pressed={locale === "so"} onClick={() => setLocale("so")}>Soomaali</button>
    </div>
    <button type="button" className="theme-button" aria-pressed={theme === "dark"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{tr(theme === "dark" ? "Light" : "Dark")}</button>
  </div>;
}
