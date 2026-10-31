import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import { notesTextOptions, registerNotesFont, visualNotesLines, wrapNotesParagraph } from './pdfNotes';

const font = new Uint8Array(readFileSync(resolve(process.cwd(), 'public/fonts/amiri/Amiri-Regular.ttf')));

afterEach(() => vi.unstubAllGlobals());

async function notesPdf(): Promise<jsPDF> {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob([font], { type: 'font/ttf' })),
  })));
  const pdf = new jsPDF({ unit: 'pt' });
  await registerNotesFont(pdf);
  pdf.setFontSize(11);
  return pdf;
}

describe('Arabic PDF speaker notes', () => {
  it('embeds the real licensed local font and shapes Arabic without reversing Latin or numbers', async () => {
    const pdf = await notesPdf();
    const text = 'مرحبا بالعالم — Project 123 (2026)';
    expect(fetch).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}fonts/amiri/Amiri-Regular.ttf`);
    expect(pdf.getFont().fontName).toBe('Folio Arabic');
    expect(pdf.getR2L()).toBe(false);
    expect(pdf.processArabic(text)).not.toBe(text);
    const visual = visualNotesLines(pdf, [text], text).join('');
    expect(visual).toContain('Project 123 (2026)');
    expect(visual.match(/\(/g)).toHaveLength(1);
    expect(visual.match(/\)/g)).toHaveLength(1);
    pdf.text(visual, 550, 50, notesTextOptions(text));
    const output = pdf.output();
    expect(output).toContain('/FontFile2');
    expect(output).toContain('/ToUnicode');
  });

  it('preserves paragraph alignment and prevents jsPDF from reordering precomputed visual glyphs', () => {
    expect(notesTextOptions('١٢٣ العربية English')).toEqual({
      align: 'right', isInputVisual: true, isInputRtl: false,
      isOutputVisual: true, isOutputRtl: false, isSymmetricSwapping: false,
    });
    expect(notesTextOptions('English العربية 123')).toMatchObject({ align: 'left', isInputRtl: false });
  });

  it('wraps using shaped font metrics without altering logical Arabic/mixed content', async () => {
    const pdf = await notesPdf();
    const text = 'هذا نص عربي طويل مع English 123 وملاحظات إضافية لاختبار التفاف السطور';
    const lines = wrapNotesParagraph(pdf, text, 110);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe(text);
    for (const line of lines) expect(pdf.getTextWidth(line)).toBeLessThanOrEqual(110);
    expect(wrapNotesParagraph(pdf, '', 110)).toEqual(['']);
  });

  it('wraps long words without separating Arabic combining marks from their base', async () => {
    const pdf = await notesPdf();
    const text = 'بَ'.repeat(100);
    const lines = wrapNotesParagraph(pdf, text, 80);
    expect(lines.join('')).toBe(text);
    expect(lines.every(line => !/^\p{Mark}/u.test(line))).toBe(true);
    for (const line of lines) expect(pdf.getTextWidth(line)).toBeLessThanOrEqual(80);
  });

  it('reports a missing bundled font rather than silently exporting unreadable notes', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404 })));
    await expect(registerNotesFont(new jsPDF())).rejects.toThrow('bundled speaker-notes font (404)');
  });
});
