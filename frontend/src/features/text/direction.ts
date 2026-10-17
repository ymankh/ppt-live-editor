import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

/** Unicode first-strong paragraph direction, including directional marks and isolates. */
export function getTextDirection(text: string): 'rtl' | 'ltr' {
  return (bidi.getEmbeddingLevels(text).paragraphs[0]?.level ?? 0) % 2 ? 'rtl' : 'ltr';
}

/** Apply UAX #9 to wrapped lines while retaining the full paragraph's embedding/bracket context. */
export function getVisualTextLines(lines: readonly string[], direction: 'rtl' | 'ltr'): string[] {
  // U+2028 is a line separator, not a paragraph separator: bracket/isolate context spans soft wraps.
  const paragraph = lines.join('\u2028');
  const embedding = bidi.getEmbeddingLevels(paragraph, direction);
  let offset = 0;
  return lines.map(line => {
    const start = offset;
    offset += line.length + 1;
    const characters = line.split('');
    for (let index = 0; index < characters.length; index++) {
      const character = characters[index];
      if (character && (embedding.levels[start + index] ?? 0) % 2) {
        characters[index] = bidi.getMirroredCharacter(character) ?? character;
      }
    }
    for (const range of bidi.getReorderSegments(paragraph, embedding, start, start + line.length - 1)) {
      const first = range[0];
      const last = range[1];
      if (first === undefined || last === undefined) continue;
      for (let left = first - start, right = last - start; left < right; left++, right--) {
        const character = characters[left];
        const other = characters[right];
        if (character !== undefined && other !== undefined) {
          characters[left] = other;
          characters[right] = character;
        }
      }
    }
    return characters.join('');
  });
}
