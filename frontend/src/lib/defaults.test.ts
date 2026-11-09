import { afterEach, describe, expect, it } from 'vitest';
import { createElement, createPresentation, createSlide, layouts } from './defaults';
import { useLocale } from '@/features/localization/locale';
import { plainText, type Slide, type SlideElement } from '@/types/model';

const slideWidth = 1920;
const arabicLetters = /[\u0600-\u06ff]/;
const latinLetters = /[a-z]/i;
const lettersFree = /^[\d\s%.,/·]*$/;

/** Every string an element shows: its layer name, text, table cells, and chart labels. */
function copyOf(element: SlideElement): string[] {
  switch (element.type) {
    case 'text': return [element.name, plainText(element.content)];
    case 'table': return [element.name, ...element.rows.flatMap(row => row.cells.map(cell => plainText(cell.content)))];
    case 'chart': return [element.name, element.options.title, ...element.categories, ...element.series.map(series => series.name)];
    default: return [element.name];
  }
}

/** Arabic copy may keep Western digits and number punctuation, but never Latin words. */
function expectArabic(value: string) {
  expect(value, value).not.toMatch(latinLetters);
  if (!lettersFree.test(value)) expect(value, value).toMatch(arabicLetters);
}

/** The Arabic slide is the English layout mirrored across the slide, with right-to-left text. */
function expectMirrored(arabic: Slide, english: Slide) {
  expect(arabic.elements.map(element => element.type)).toEqual(english.elements.map(element => element.type));
  expect(arabic.background).toEqual(english.background);
  arabic.elements.forEach((element, index) => {
    const source = english.elements[index];
    if (!source) throw new Error('Missing English element');
    copyOf(element).forEach(expectArabic);
    // The start edge moves to the other side; Arabic boxes may only grow toward their end.
    expect(element.x + element.width).toBe(slideWidth - source.x);
    expect(element.y).toBe(source.y);
    if (source.x >= 0 && source.x + source.width <= slideWidth) {
      expect(element.x).toBeGreaterThanOrEqual(0);
      expect(element.x + element.width).toBeLessThanOrEqual(slideWidth);
    }
    if (element.type !== 'text' || source.type !== 'text') return;
    expect(element.letterSpacing).toBe(0);
    expect(element.align).toBe(source.align === 'left' ? 'right' : source.align === 'right' ? 'left' : 'center');
    // Only digit-only labels, such as page numbers pinned to the far edge, end up left-aligned.
    if (element.align === 'left') expect(plainText(element.content)).toMatch(lettersFree);
  });
}

afterEach(() => {
  useLocale.getState().setLocale('en');
  localStorage.clear();
});

describe('English starter content', () => {
  it('keeps the designed deck, layouts, and element defaults', () => {
    const deck = createPresentation('en');
    expect(deck.title).toBe('The next chapter');
    expect(deck.slides).toHaveLength(6);
    const cover = deck.slides[0];
    if (!cover) throw new Error('Missing cover');
    expect(cover.notes).toBe('Welcome the team. This quarter is about turning our creative ambition into focused, meaningful growth.');
    const [pill, tag, title, , image, , brand, page] = cover.elements;
    expect(pill).toMatchObject({ type: 'shape', x: 115, width: 650 });
    expect(tag).toMatchObject({ type: 'text', x: 143, align: 'left', letterSpacing: 3 });
    expect(title).toMatchObject({ type: 'text', x: 110, y: 335, width: 930, fontSize: 150, align: 'left', letterSpacing: -6 });
    expect(title?.type === 'text' && plainText(title.content)).toBe('The next\nchapter.');
    expect(image).toMatchObject({ type: 'image', x: 1070, width: 700 });
    expect(brand?.type === 'text' && plainText(brand.content)).toBe('ACME STUDIO');
    expect(page).toMatchObject({ type: 'text', x: 1740, align: 'right' });

    const [photo, heading] = createSlide('image-right', 'en').elements;
    expect(photo).toMatchObject({ type: 'image', x: 1060 });
    expect(heading).toMatchObject({ type: 'text', x: 120, align: 'left' });
    expect(heading?.type === 'text' && plainText(heading.content)).toBe('Show, don’t\njust tell.');

    const text = createElement('text', undefined, 'en');
    expect(text).toMatchObject({ name: 'Text', x: 640, align: 'left', letterSpacing: 0 });
    expect(plainText(text.content)).toBe('Your text here');
    expect(createElement('table', undefined, 'en').rows[0]?.cells.map(cell => plainText(cell.content))).toEqual(['Initiative', 'Owner', 'Status']);
    const chart = createElement('chart', undefined, 'en');
    expect(chart.categories).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(chart.series.map(series => series.name)).toEqual(['Growth', 'Target']);
    expect(chart.options.title).toBe('Quarterly growth');
  });
});

describe('Arabic starter content', () => {
  it('mirrors the starter deck with Arabic copy, notes, and title', () => {
    const arabic = createPresentation('ar'), english = createPresentation('en');
    expect(arabic.title).toBe('الفصل القادم');
    expect(arabic.slideSize).toEqual(english.slideSize);
    expect(arabic.slides).toHaveLength(english.slides.length);
    arabic.slides.forEach((slide, index) => {
      const source = english.slides[index];
      if (!source) throw new Error('Missing English slide');
      expectMirrored(slide, source);
      expect(Boolean(slide.notes)).toBe(Boolean(source.notes));
      if (slide.notes) expectArabic(slide.notes);
    });
    // Western digits stay as they are.
    const numbers = arabic.slides.flatMap(slide => slide.elements).flatMap(element => element.type === 'text' ? [plainText(element.content)] : []);
    expect(numbers).toEqual(expect.arrayContaining(['01', '72%', '06']));
    expect(numbers.some(value => value.includes('2025'))).toBe(true);
  });

  it('mirrors every layout with Arabic placeholder copy', () => {
    for (const layout of layouts) expectMirrored(createSlide(layout.id, 'ar'), createSlide(layout.id, 'en'));
    const [title] = createSlide('title', 'ar').elements;
    expect(title?.type === 'text' && title.align).toBe('right');
  });

  it('creates right-to-left element defaults in Arabic', () => {
    const text = createElement('text', undefined, 'ar');
    expect(plainText(text.content)).toBe('اكتب النص هنا');
    expect(text).toMatchObject({ align: 'right', letterSpacing: 0 });
    for (const type of ['text', 'shape', 'line', 'image', 'table', 'chart'] as const) copyOf(createElement(type, undefined, 'ar')).forEach(expectArabic);
    // Slide coordinates stay left to right, so the first column (Initiative) is listed last, on the right.
    const [header, body] = createElement('table', undefined, 'ar').rows.map(row => row.cells.map(cell => plainText(cell.content)));
    expect(header).toEqual(['الحالة', 'المسؤول', 'المبادرة']);
    expect(body).toEqual(['قيد التنفيذ', 'الفريق', 'مبادرة جديدة']);
    const chart = createElement('chart', undefined, 'ar');
    expect(chart.series.map(series => series.values)).toEqual(createElement('chart', undefined, 'en').series.map(series => series.values));
  });

  it('follows the interface language when no locale is passed', () => {
    useLocale.getState().setLocale('ar');
    expect(createPresentation().title).toBe('الفصل القادم');
    expect(plainText(createElement('text').content)).toBe('اكتب النص هنا');
    expect(createSlide('title').elements.every(element => element.type !== 'text' || element.align === 'right')).toBe(true);
    useLocale.getState().setLocale('en');
    expect(createPresentation().title).toBe('The next chapter');
  });
});
