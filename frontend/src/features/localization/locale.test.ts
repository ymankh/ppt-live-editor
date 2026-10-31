import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fresh imports intentionally exercise the persisted-locale module initialization boundary.
// Static imports would initialize the store before each test can arrange browser storage.

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  document.documentElement.lang = '';
  document.documentElement.dir = '';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
  document.title = 'Folio — Presentation Studio';
});

describe('UI locale', () => {
  it('defaults to English and initializes document direction', async () => {
    const { useLocale } = await import('./locale');
    expect(useLocale.getState().locale).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('loads a saved Arabic preference before rendering', async () => {
    localStorage.setItem('folio-locale', 'ar');
    const { useLocale } = await import('./locale');
    expect(useLocale.getState().locale).toBe('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('ignores unsupported saved locale values', async () => {
    localStorage.setItem('folio-locale', 'fr');
    const { useLocale } = await import('./locale');
    expect(useLocale.getState().locale).toBe('en');
  });

  it('persists changes and updates the document without navigation', async () => {
    const { useLocale } = await import('./locale');
    const url = location.href;
    useLocale.getState().setLocale('ar');
    expect(localStorage.getItem('folio-locale')).toBe('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    useLocale.getState().setLocale('en');
    expect(localStorage.getItem('folio-locale')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(location.href).toBe(url);
  });

  it('switches even if browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    const { useLocale } = await import('./locale');
    expect(useLocale.getState().locale).toBe('en');
    useLocale.getState().setLocale('ar');
    expect(useLocale.getState().locale).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('translates only known Arabic labels and preserves English and missing keys', async () => {
    const { translate } = await import('./locale');
    const { arabic } = await import('./ar');
    expect(translate('Settings', 'ar')).toBe(arabic.Settings);
    expect(translate('Settings', 'en')).toBe('Settings');
    expect(translate('An unknown interface label', 'ar')).toBe('An unknown interface label');
    expect(translate('toString', 'ar')).toBe('toString');
  });

  it('reactively changes the translator for mounted consumers', async () => {
    const { useLocale, useTranslation } = await import('./locale');
    const { arabic } = await import('./ar');
    const { result } = renderHook(() => useTranslation());
    const initialTranslator = result.current;
    expect(initialTranslator('Settings')).toBe('Settings');
    act(() => useLocale.getState().setLocale('ar'));
    expect(result.current('Settings')).toBe(arabic.Settings);
    expect(result.current).not.toBe(initialTranslator);
    act(() => useLocale.getState().setLocale('en'));
    expect(result.current('Settings')).toBe('Settings');
  });
});
