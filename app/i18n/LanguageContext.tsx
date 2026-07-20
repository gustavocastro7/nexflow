'use client';

import { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { translations, SUPPORTED_LANGUAGES, type Language } from './dictionaries';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'language';

function isSupported(value: string | null): value is Language {
  return !!value && (SUPPORTED_LANGUAGES as string[]).includes(value);
}

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'pt-BR';
  const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('i18nextLng');
  return isSupported(stored) ? stored : 'pt-BR';
}

function resolve(dict: Record<string, any>, key: string): unknown {
  return key.split('.').reduce((acc: any, part) => (acc == null ? undefined : acc[part]), dict);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readInitialLanguage());

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
      localStorage.setItem('i18nextLng', lang);
    }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const value = resolve(translations[language], key);
    const fallback = typeof value === 'string' ? value : resolve(translations['pt-BR'], key);
    let result = typeof fallback === 'string' ? fallback : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        result = result.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return result;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
