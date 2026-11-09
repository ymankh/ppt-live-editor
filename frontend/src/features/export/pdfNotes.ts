import type { jsPDF, TextOptionsLight } from 'jspdf';
import { getTextDirection, getVisualTextLines } from '@/features/text/direction';
import { blobDataUrl } from './assets';

// Unmodified IBM Plex Sans Arabic Regular, SIL OFL 1.1 (public/fonts/ibm-plex-sans-arabic/OFL.txt), the interface's
// Arabic font. Primary source: https://github.com/IBM/plex/releases/tag/%40ibm%2Fplex-sans-arabic%401.1.0
// jsPDF shapes Arabic into presentation forms (U+FB50–U+FEFC), which this TTF maps; it also has Latin glyphs.
const notesFontFile = 'IBMPlexSansArabic-Regular.ttf';
const notesFontFamily = 'IBM Plex Sans Arabic';
export async function registerNotesFont(pdf: jsPDF): Promise<void> {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/ibm-plex-sans-arabic/${notesFontFile}`);
  if (!response.ok) throw new Error(`Cannot load bundled speaker-notes font (${response.status}).`);
  const data = await blobDataUrl(await response.blob());
  pdf.addFileToVFS(notesFontFile, data.slice(data.indexOf(',') + 1));
  pdf.addFont(notesFontFile, notesFontFamily, 'normal');
  pdf.setFont(notesFontFamily, 'normal');
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
