import { useMemo } from 'react';
import { create } from 'zustand';
import { request } from '@/lib/api';
import { userMessage } from '@/features/errors/userMessage';
import { strings } from '@/strings';

export interface FontRecord { id: string; family: string }
interface FontRegistry {
  fonts: FontRecord[];
  ready: boolean;
  /** A friendly, translatable explanation of the last failure. */
  error: string | null;
  initialize: () => Promise<void>;
  uploadFont: (file: File, family: string) => Promise<void>;
}

const maximumBytes = 20 * 1024 * 1024;
const builtinFamilies = ['Geist', 'Geist Variable', 'IBM Plex Sans Arabic', 'Folio Arabic', 'Inter', 'Arial', 'Tahoma', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];
const genericFamilies: Record<string, true> = {
  serif: true, 'sans-serif': true, monospace: true, cursive: true, fantasy: true, 'system-ui': true,
  'ui-serif': true, 'ui-sans-serif': true, 'ui-monospace': true, 'ui-rounded': true, math: true, emoji: true, fangsong: true,
};
const normalize = (family: string) => family.trim().replace(/^(['"])(.*)\1$/, '$2').toLocaleLowerCase('en-US');
let initialization: Promise<void> | undefined;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The font could not be loaded.';
}

async function loadFace(family: string, bytes: ArrayBuffer): Promise<FontFace> {
  try {
    return await new FontFace(JSON.stringify(family), bytes).load();
  } catch (error) {
    throw new Error('The browser could not load this font. Choose a valid TTF, OTF, WOFF, or WOFF2 file.', { cause: error });
  }
}

export const useFontRegistry = create<FontRegistry>((set, get) => ({
  fonts: [],
  ready: false,
  error: null,
  initialize: () => {
    if (get().ready) return Promise.resolve();
    if (initialization) return initialization;
    set({ error: null });
    initialization = (async () => {
      if (typeof FontFace === 'undefined' || !document.fonts) throw new Error('This browser does not support loading custom fonts.');
      const fonts = await (await request('/api/fonts')).json() as FontRecord[];
      const faces = await Promise.all(fonts.map(async (font) => {
        const response = await request(`/api/fonts/${encodeURIComponent(font.id)}/content`);
        try {
          return await loadFace(font.family, await response.arrayBuffer());
        } catch (error) {
          throw new Error(`${font.family}: ${errorMessage(error)}`, { cause: error });
        }
      }));
      await Promise.all([
        document.fonts.load('16px "Geist Variable"'),
        // The Arabic fallback of every slide text: the regular and bold faces slide text renders with.
        document.fonts.load('16px "IBM Plex Sans Arabic"', 'العربية'),
        document.fonts.load('bold 16px "IBM Plex Sans Arabic"', 'العربية'),
        document.fonts.load('16px "Folio Arabic"', 'العربية'),
      ]);
      for (const face of faces) document.fonts.add(face);
      set({ fonts, ready: true, error: null });
    })().catch((error: unknown) => {
      set({ ready: false, error: userMessage(error, strings.errors.loadFontLibrary) });
      throw error;
    }).finally(() => { initialization = undefined; });
    return initialization;
  },
  uploadFont: async (file, requestedFamily) => {
    const family = requestedFamily.trim();
    try {
      let invalidFamily = !family || family.length > 200;
      for (const character of family) {
        const code = character.charCodeAt(0);
        if (code < 32 || code === 127 || `,;"'\\{}`.includes(character)) {
          invalidFamily = true;
          break;
        }
      }
      if (invalidFamily) throw new Error('Enter a font family name of up to 200 characters without quotes, commas, or CSS punctuation.');
      if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) throw new Error('Choose a TTF, OTF, WOFF, or WOFF2 font file.');
      if (file.size === 0) throw new Error('The font file is empty.');
      if (file.size > maximumBytes) throw new Error('Font exceeds the 20 MiB limit.');
      await get().initialize();
      if (get().fonts.some(font => normalize(font.family) === normalize(family))) throw new Error('A font with this family name is already uploaded.');
      const bytes = await file.arrayBuffer();
      // Validate the actual bytes before persisting; an extension or MIME type is not proof of a font.
      const face = await loadFace(family, bytes);
      const response = await request(`/api/fonts?family=${encodeURIComponent(family)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes,
      });
      const font = await response.json() as FontRecord;
      document.fonts.add(face);
      set(state => ({ fonts: [...state.fonts, font], error: null }));
    } catch (error) {
      set({ error: userMessage(error, strings.errors.uploadFont) });
      throw error;
    }
  },
}));

/** Test the requested families, not FontFaceSet.check (which also succeeds for missing fonts). */
export function isFontAvailable(family: string): boolean {
  const families = family.match(/(?:"[^"]*"|'[^']*'|[^,])+/g) ?? [];
  return families.some(value => {
    const name = normalize(value);
    if (!name) return false;
    if (Object.hasOwn(genericFamilies, name)) return true;
    if (typeof document === 'undefined') return false;
    // Geist is the document's existing alias for the bundled Geist Variable fallback.
    const requested = name === 'geist' ? 'geist variable' : name;
    if (document.fonts) {
      let declared = false;
      document.fonts.forEach(face => {
        if (normalize(face.family) === requested && face.status === 'loaded') declared = true;
      });
      if (declared) return true;
    }
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return false;
    const sample = 'mmmmmmmmmmWWWWWWWiii0123456789 العربية';
    return ['monospace', 'serif', 'sans-serif'].some(fallback => {
      context.font = `72px ${fallback}`;
      const baseline = context.measureText(sample).width;
      context.font = `72px ${JSON.stringify(value.trim().replace(/^(['"])(.*)\1$/, '$2'))}, ${fallback}`;
      return context.measureText(sample).width !== baseline;
    });
  });
}

export function useAvailableFontFamilies(): string[] {
  const fonts = useFontRegistry(state => state.fonts);
  const ready = useFontRegistry(state => state.ready);
  return useMemo(() => {
    const seen = new Set<string>();
    return [...builtinFamilies.filter(isFontAvailable), ...fonts.map(font => font.family)].filter(family => {
      const key = normalize(family);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [fonts, ready]);
}
