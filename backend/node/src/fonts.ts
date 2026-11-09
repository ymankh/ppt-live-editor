// Font library rules shared by the upload route. They mirror backend/Folio.Api/Controllers/FontsController.cs,
// so both backends accept and reject exactly the same uploads.

export const maximumFontBytes = 20 * 1024 * 1024;

export const fontMessages = {
  family: 'Enter a font family name of up to 200 characters without quotes, commas, or CSS punctuation.',
  format: 'Choose a TTF, OTF, WOFF, or WOFF2 font file.',
  tooLarge: 'Font exceeds the 20 MiB limit.',
  duplicate: 'A font with this family name is already uploaded.',
} as const;

// Control characters (char.IsControl) and characters that would break a CSS font-family value.
const invalidFamilyCharacter = /[\u0000-\u001f\u007f-\u009f,;"'\\{}]/;

/** The trimmed family name from the `family` query value, or undefined when it is missing or unusable. */
export function readFontFamily(value: string | null): string | undefined {
  const family = value?.trim() ?? '';
  return family === '' || family.length > 200 || invalidFamilyCharacter.test(family) ? undefined : family;
}

const trueType = 0x00010000;
const appleTrueType = 0x74727565; // 'true'
const openType = 0x4f54544f; // 'OTTO'
const woff = 0x774f4646; // 'wOFF'
const woff2 = 0x774f4632; // 'wOF2'

/**
 * The content type of TTF, OTF, WOFF, or WOFF2 bytes whose header and table directory are well formed,
 * or undefined for anything else. A file extension or declared MIME type is not proof of a font.
 */
export function fontContentType(content: Uint8Array): string | undefined {
  const length = content.byteLength;
  if (length < 12) return undefined;
  const view = new DataView(content.buffer, content.byteOffset, length);
  const signature = view.getUint32(0);
  if (signature === trueType || signature === appleTrueType || signature === openType) {
    const tableCount = view.getUint16(4);
    const directoryEnd = 12 + tableCount * 16;
    if (tableCount === 0 || directoryEnd > length) return undefined;
    for (let index = 0; index < tableCount; index++) {
      const entry = 12 + index * 16;
      const offset = view.getUint32(entry + 8);
      const tableLength = view.getUint32(entry + 12);
      if (offset < directoryEnd || offset + tableLength > length) return undefined;
    }
    return signature === openType ? 'font/otf' : 'font/ttf';
  }
  if (signature !== woff && signature !== woff2) return undefined;
  const headerSize = signature === woff ? 44 : 48;
  if (length < headerSize || view.getUint32(8) !== length || view.getUint16(14) !== 0) return undefined;
  const count = view.getUint16(12);
  if (count === 0 || view.getUint32(16) < 12 + count * 16) return undefined;
  if (signature === woff2) {
    const compressedSize = view.getUint32(20);
    return compressedSize > 0 && headerSize + compressedSize <= length ? 'font/woff2' : undefined;
  }
  const end = headerSize + count * 20;
  if (end > length) return undefined;
  for (let index = 0; index < count; index++) {
    const entry = headerSize + index * 20;
    const offset = view.getUint32(entry + 4);
    const compressedLength = view.getUint32(entry + 8);
    const originalLength = view.getUint32(entry + 12);
    if (offset < end || compressedLength > originalLength || offset + compressedLength > length) return undefined;
  }
  return 'font/woff';
}
