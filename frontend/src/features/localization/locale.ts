import { useCallback } from 'react';
import { create } from 'zustand';
import { arabic } from './ar';

export type Locale = 'en' | 'ar';
const storageKey = 'folio-locale';

function readLocale(): Locale {
  try {
    return localStorage.getItem(storageKey) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

function applyDocumentLocale(locale: Locale) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  document.title = translate('Folio — Presentation Studio', locale);
}

const initialLocale = readLocale();
applyDocumentLocale(initialLocale);

export const useLocale = create<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
}>((set) => ({
  locale: initialLocale,
  setLocale: (locale) => {
    try {
      localStorage.setItem(storageKey, locale);
    } catch {
      // The interface can still switch when browser storage is unavailable.
    }
    applyDocumentLocale(locale);
    set({ locale });
  },
}));

export function translate(value: string, locale: Locale): string {
  return locale === 'ar' && Object.hasOwn(arabic, value) ? arabic[value] ?? value : value;
}

export function useTranslation(): (value: string) => string {
  const locale = useLocale((state) => state.locale);
  return useCallback((value: string) => translate(value, locale), [locale]);
}
