import type { jsPDF, TextOptionsLight } from 'jspdf';
import { getTextDirection, getVisualTextLines } from '@/features/text/direction';
import { blobDataUrl } from './assets';

// Unmodified Amiri Regular, SIL OFL 1.1 (public/fonts/amiri/OFL.txt).
// Primary source: https://github.com/aliftype/amiri/tree/d3d0c5cb6fe7196cb4a58608fc5c8ecd2e6e80fa
export async function registerNotesFont(pdf: jsPDF): Promise<void> {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/amiri/Amiri-Regular.ttf`);
  if (!response.ok) throw new Error(`Cannot load bundled speaker-notes font (${response.status}).`);
  const data = await blobDataUrl(await response.blob());
  pdf.addFileToVFS('Amiri-Regular.ttf', data.slice(data.indexOf(',') + 1));
  pdf.addFont('Amiri-Regular.ttf', 'Folio Arabic', 'normal');
  pdf.setFont('Folio Arabic', 'normal');
  // Never reverse every character: Latin and numbers must remain in their own reading order.
  pdf.setR2L(false);
}

export function notesTextOptions(text: string): TextOptionsLight {
  const rtl = getTextDirection(text) === 'rtl';
  return {
    align: rtl ? 'right' : 'left',
    // Text is already shaped/reordered by UAX #9. Disable jsPDF's older bidi/mirroring pass.
    isInputVisual: true,
    isInputRtl: false,
    isOutputVisual: true,
    isOutputRtl: false,
    isSymmetricSwapping: false,
  };
}

export function visualNotesLines(pdf: jsPDF, logicalLines: readonly string[], paragraph: string): string[] {
  const shapedLines = logicalLines.map(line => pdf.processArabic(line));
  return getVisualTextLines(shapedLines, getTextDirection(paragraph));
}

/** Measure logical text with jsPDF's Arabic shaper, then shape each final line at output. */
export function wrapNotesParagraph(pdf: jsPDF, text: string, maxWidth: number): string[] {
  if (!text) return [''];
  const lines: string[] = [];
  let line = '';
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const word of text.split(/[ \t]+/u)) {
    const candidate = line ? `${line} ${word}` : word;
    if (pdf.getTextWidth(candidate) <= maxWidth) { line = candidate; continue; }
    if (line) { lines.push(line); line = ''; }
    // Long unbroken words/URLs must wrap without splitting a combining sequence.
    for (const { segment } of segmenter.segment(word)) {
      if (line && pdf.getTextWidth(line + segment) > maxWidth) {
        lines.push(line);
        line = '';
      }
      line += segment;
    }
  }
  lines.push(line);
  return lines;
}
