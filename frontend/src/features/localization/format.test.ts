import { describe, expect, it } from 'vitest';
import { formatDate, formatTime, interpolate, intlLocale } from './format';

const arabicIndicDigits = /[\u0660-\u0669\u06F0-\u06F9]/;
const sample = new Date(2026, 10, 9, 13, 5, 0);

describe('interface formatting', () => {
  it('formats Arabic dates with Western digits', () => {
    const value = formatDate(sample, 'ar');
    expect(value).not.toMatch(arabicIndicDigits);
    expect(value).toContain('2026');
    expect(value).toMatch(/\b9\b/);
    expect(value).toMatch(/\b11\b/);
  });

  it('formats Arabic times with Western digits', () => {
    const value = formatTime(sample, 'ar', { hour: '2-digit', minute: '2-digit' });
    expect(value).not.toMatch(arabicIndicDigits);
    expect(value).toMatch(/01:05|13:05/);
  });

  it('formats with Arabic month names while keeping Western digits', () => {
    const value = formatDate(sample, 'ar', { day: 'numeric', month: 'long', year: 'numeric' });
    expect(value).toContain('نوفمبر');
    expect(value).not.toMatch(arabicIndicDigits);
    expect(value).toContain('2026');
  });

  it('keeps English formatting unchanged', () => {
    expect(formatDate(sample, 'en')).toBe(sample.toLocaleDateString('en'));
    expect(formatTime(sample, 'en')).toBe(sample.toLocaleTimeString('en'));
  });

  it('selects the Latin numbering system only for Arabic', () => {
    expect(intlLocale('ar')).toBe('ar-u-nu-latn');
    expect(intlLocale('en')).toBe('en');
  });

  it('fills placeholders in any word order and leaves unknown placeholders', () => {
    expect(interpolate('{name} color', { name: 'Series 1' })).toBe('Series 1 color');
    expect(interpolate('لون {name}', { name: 'Series 1' })).toBe('لون Series 1');
    expect(interpolate('{row}, {column}', { row: 2, column: 3 })).toBe('2, 3');
    expect(interpolate('{missing} value', {})).toBe('{missing} value');
    expect(interpolate('{toString}', {})).toBe('{toString}');
  });
});
