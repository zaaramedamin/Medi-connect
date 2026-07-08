import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FR } from './translations';

export type Lang = 'fr' | 'en';

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  /** Translate an English source string; interpolates {vars}. Falls back to the source. */
  t: (source: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'medi-lang';

function readInitialLang(): Lang {
  if (typeof window === 'undefined') return 'fr';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'fr' ? stored : 'fr'; // French by default
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggle = useCallback(() => setLangState(l => (l === 'fr' ? 'en' : 'fr')), []);

  const t = useCallback(
    (source: string, vars?: Record<string, string | number>) => {
      let out = lang === 'fr' ? FR[source] ?? source : source;
      if (vars) {
        for (const [key, value] of Object.entries(vars)) {
          out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        }
      }
      return out;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}

/** Convenience for components that only need the translate function. */
export function useT() {
  return useI18n().t;
}
