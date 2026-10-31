import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import pptxgen from 'pptxgenjs';
import { createElement, createPresentation, createSlide } from '@/lib/defaults';
import { unitsToInches } from '@/lib/units';
import { textDocument } from '@/types/model';
import type { Presentation } from '@/types/model';
import { exportPptx } from './pptx';

afterEach(() => vi.restoreAllMocks());

async function exportedXml(project: Presentation): Promise<Document> {
  const result: { archive?: JSZip } = {};
  vi.spyOn(pptxgen.prototype, 'writeFile').mockImplementation(async function (this: pptxgen, options) {
    result.archive = await JSZip.loadAsync(await this.write({ outputType: 'uint8array' }));
    return options?.fileName ?? 'presentation.pptx';
  });
  await exportPptx(project);
  const slide = result.archive?.file('ppt/slides/slide1.xml');
  if (!slide) throw new Error('PPTX slide was not generated');
  return new DOMParser().parseFromString(await slide.async('string'), 'application/xml');
}

function paragraph(document: Document, text: string): Element {
  const match = Array.from(document.getElementsByTagName('a:p')).find(item => item.textContent === text);
  if (!match) throw new Error(`PPTX paragraph missing: ${text}`);
  return match;
}

describe('Arabic PPTX export', () => {
  it('retains logical mixed text and paragraph-specific RTL without mirroring coordinates', async () => {
    const project = createPresentation();
    const slide = createSlide();
    const text = createElement('text');
    text.x = 137;
    text.content = textDocument('مرحبا English 123\nEnglish العربية 456');
    slide.elements = [text];
    project.slides = [slide];
    const original = structuredClone(project);
    const xml = await exportedXml(project);
    expect(paragraph(xml, 'مرحبا English 123').getElementsByTagName('a:pPr')[0]?.getAttribute('rtl')).toBe('1');
    expect(paragraph(xml, 'English العربية 456').getElementsByTagName('a:pPr')[0]?.getAttribute('rtl')).not.toBe('1');
    expect(xml.getElementsByTagName('a:rPr')[0]?.getAttribute('lang')).toBe('ar-SA');
    const textShape = Array.from(xml.getElementsByTagName('p:sp')).find(shape => shape.textContent?.includes('مرحبا English 123'));
    const offset = textShape?.getElementsByTagName('a:off')[0];
    expect(offset?.getAttribute('x')).toBe(String(Math.round(unitsToInches(text.x) * 914400)));
    expect(project).toEqual(original);
  });

  it('honors explicit paragraph direction rather than overriding it based on script', async () => {
    const project = createPresentation();
    const slide = createSlide();
    const text = createElement('text');
    text.content = { type: 'doc', content: [
      { type: 'paragraph', attrs: { dir: 'rtl' }, content: [{ type: 'text', text: 'English 123' }] },
      { type: 'paragraph', attrs: { dir: 'ltr' }, content: [{ type: 'text', text: 'العربية' }] },
    ] };
    slide.elements = [text];
    project.slides = [slide];
    const xml = await exportedXml(project);
    expect(paragraph(xml, 'English 123').getElementsByTagName('a:pPr')[0]?.getAttribute('rtl')).toBe('1');
    expect(paragraph(xml, 'العربية').getElementsByTagName('a:pPr')[0]?.getAttribute('rtl')).not.toBe('1');
  });

  it('exports Arabic shape labels and mixed-direction table paragraphs without changing content', async () => {
    const project = createPresentation();
    const slide = createSlide();
    const shape = createElement('shape');
    shape.text = textDocument('عنوان عربي');
    const table = createElement('table');
    const cell = table.rows[0]?.cells[0];
    if (!cell) throw new Error('Default table is missing a cell');
    cell.content = textDocument('خلية عربية 123\nEnglish العربية');
    slide.elements = [shape, table];
    project.slides = [slide];
    const xml = await exportedXml(project);
    for (const text of ['عنوان عربي', 'خلية عربية 123']) {
      expect(paragraph(xml, text).getElementsByTagName('a:pPr')[0]?.getAttribute('rtl')).toBe('1');
    }
    expect(paragraph(xml, 'English العربية').getElementsByTagName('a:pPr')[0]?.getAttribute('rtl')).not.toBe('1');
  });
});
