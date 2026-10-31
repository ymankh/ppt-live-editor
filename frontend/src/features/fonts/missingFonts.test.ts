import { describe, expect, it } from 'vitest';
import { createElement, createPresentation, createSlide } from '@/lib/defaults';
import type { TipTapDocument } from '@/types/model';
import { missingFontFamilies, referencedFontFamilies, replaceFontFamilies } from './missingFonts';

function fontDocument(): TipTapDocument {
  return { type: 'doc', content: [{ type: 'paragraph', attrs: { fontFamily: 'Missing Paragraph', textAlign: 'right', dir: 'rtl' }, content: [
    { type: 'text', text: 'Missing Run مرحبا', marks: [{ type: 'textStyle', attrs: { fontFamily: 'Missing Run', color: '#123456', fontSize: '28px' } }, { type: 'link', attrs: { href: 'https://example.test/Missing Run' } }] },
    { type: 'text', text: ' remains the same', marks: [{ type: 'bold' }] },
  ] }] };
}

describe('presentation font discovery', () => {
  it('finds theme, text, shape, table and nested paragraph/mark fonts once without mutating the document', () => {
    const document = createPresentation();
    document.theme.fonts = { heading: 'Missing Heading', body: 'Geist' };
    const text = createElement('text');
    text.fontFamily = 'Missing Text';
    text.content = fontDocument();
    const shape = createElement('shape');
    shape.text = fontDocument();
    const table = createElement('table');
    const cell = table.rows[0]?.cells[0];
    if (!cell) throw new Error('Expected default table cell');
    cell.content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'table', marks: [{ type: 'textStyle', attrs: { fontFamily: '"missing run", serif' } }] }] }] };
    document.slides = [{ ...createSlide(), elements: [text, shape, table] }];
    const before = structuredClone(document);
    Object.freeze(document.theme.fonts);
    expect(referencedFontFamilies(document)).toEqual(['Missing Heading', 'Geist', 'Missing Text', 'Missing Paragraph', 'Missing Run', 'serif']);
    expect(missingFontFamilies(document, family => ['geist', 'serif'].includes(family.toLowerCase()))).toEqual(['Missing Heading', 'Missing Text', 'Missing Paragraph', 'Missing Run']);
    expect(document).toEqual(before);
  });

  it('does not report the default Geist theme when the registry declares it available', () => {
    const document = createPresentation();
    document.slides = [{ ...createSlide(), elements: [createElement('text')] }];
    expect(missingFontFamilies(document, family => family === 'Geist')).toEqual([]);
  });
});

describe('explicit font replacement', () => {
  it('changes all targeted font fields and preserves content, colors, geometry and unrelated attributes', () => {
    const document = createPresentation();
    document.theme.fonts = { heading: 'Missing Run', body: 'Missing Paragraph' };
    const text = createElement('text');
    text.fontFamily = 'Missing Run';
    text.x = 137;
    text.color = '#abcdef';
    text.content = fontDocument();
    const shape = createElement('shape');
    shape.text = fontDocument();
    const table = createElement('table');
    const cell = table.rows[0]?.cells[0];
    if (!cell) throw new Error('Expected default table cell');
    cell.content = fontDocument();
    document.slides = [{ ...createSlide(), elements: [text, shape, table] }];
    const original = structuredClone(document);
    replaceFontFamilies(document, { 'missing run': 'Geist', 'Missing Paragraph': 'Folio Arabic' });
    expect(referencedFontFamilies(document)).toEqual(['Geist', 'Folio Arabic']);
    expect(text.x).toBe(137);
    expect(text.color).toBe('#abcdef');
    expect(text.content.content?.[0]?.content?.[0]).toMatchObject({ text: 'Missing Run مرحبا', marks: [
      { type: 'textStyle', attrs: { fontFamily: 'Geist', color: '#123456', fontSize: '28px' } },
      { type: 'link', attrs: { href: 'https://example.test/Missing Run' } },
    ] });
    replaceFontFamilies(document, { Geist: 'Missing Run', 'Folio Arabic': 'Missing Paragraph' });
    expect(document).toEqual(original);
  });

  it('replaces quoted CSS families case-insensitively without touching fallback families or other styles', () => {
    const document = createPresentation();
    document.theme.fonts = { heading: "'Missing Font', Georgia, serif", body: '  missing font , sans-serif' };
    replaceFontFamilies(document, { 'MISSING FONT': 'Geist' });
    expect(document.theme.fonts).toEqual({ heading: "'Geist', Georgia, serif", body: '  Geist , sans-serif' });
  });

  it('leaves the presentation untouched when no replacement was approved', () => {
    const document = createPresentation();
    const original = structuredClone(document);
    replaceFontFamilies(document, {});
    expect(document).toEqual(original);
  });
});
