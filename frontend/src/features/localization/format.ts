import type { Locale } from './locale';

/**
 * The BCP 47 tag for dates, times, and numbers shown in the interface. Arabic keeps Western digits
 * (0-9), as everywhere else in the app, instead of the Arabic-Indic digits `ar` selects by default.
 */
export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-u-nu-latn' : 'en';
}

export function formatDate(value: Date | number | string, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleDateString(intlLocale(locale), options);
}

export function formatTime(value: Date | number | string, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleTimeString(intlLocale(locale), options);
}

/**
 * Fills `{name}` placeholders in a translated template, so each language can place values where its
 * grammar needs them (for example "{name} color" and "لون {name}"). Unknown placeholders stay as written.
 */
export function interpolate(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => Object.hasOwn(values, key) ? String(values[key]) : placeholder);
}
