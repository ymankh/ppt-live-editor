import { describe, expect, it } from 'vitest';
import { getTextDirection, getVisualTextLines } from './direction';

describe('first-strong text direction', () => {
  it.each([
    ['مرحبا بالعالم', 'rtl'],
    ['123 (العربية) English', 'rtl'],
    ['١٢٣ — العربية', 'rtl'],
    ['َُ العربية', 'rtl'],
    ['English العربية 123', 'ltr'],
    ['123 — English العربية', 'ltr'],
    ['שלום English', 'rtl'],
    ['中文 العربية', 'ltr'],
    ['123 ١٢٣ !', 'ltr'],
    ['', 'ltr'],
    ['\u200fEnglish', 'rtl'],
    ['\u200eالعربية', 'ltr'],
  ] as const)('detects %j as %s', (text, expected) => {
    expect(getTextDirection(text)).toBe(expected);
  });

  it('retains paired parentheses and complete Latin/number runs in RTL text', () => {
    expect(getVisualTextLines(['مرحبا بالعالم — Project 123 (2026)'], 'rtl')).toEqual([
      'Project 123 (2026) — ملاعلاب ابحرم',
    ]);
  });

  it('uses Unicode embedding levels for English-first text with Arabic and numbers', () => {
    expect(getVisualTextLines(['English first — نص عربي 456'], 'ltr')).toEqual([
      'English first — 456 يبرع صن',
    ]);
  });

  it('retains paragraph context across soft-wrapped Latin continuation lines', () => {
    const lines = getVisualTextLines(['مرحبا بالعالم —', 'Project 123 (2026)'], 'rtl');
    expect(lines[1]).toBe('Project 123 (2026)');
  });
});
