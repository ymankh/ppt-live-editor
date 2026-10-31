import type { TipTapDocument } from '@/types/model';

interface ThemeFontSet { latin: string; complex: string; eastAsian: string; scripts: Record<string, string> }
export interface PptxThemeFonts { major: ThemeFontSet; minor: ThemeFontSet }

function child(node: Element | undefined, name: string): Element | undefined {
  return node ? [...node.children].find(element => element.localName === name) : undefined;
}

export function readPptxThemeFonts(document?: Document): PptxThemeFonts {
  const scheme = document?.getElementsByTagNameNS('*', 'fontScheme')[0];
  const read = (name: string): ThemeFontSet => {
    const node = child(scheme, name);
    const scripts: Record<string, string> = {};
    for (const font of node?.children ?? []) {
      const script = font.getAttribute('script');
      const typeface = font.getAttribute('typeface');
      if (font.localName === 'font' && script && typeface) scripts[script] = typeface;
    }
    return { latin: child(node, 'latin')?.getAttribute('typeface') ?? '', complex: child(node, 'cs')?.getAttribute('typeface') ?? '', eastAsian: child(node, 'ea')?.getAttribute('typeface') ?? '', scripts };
  };
  return { major: read('majorFont'), minor: read('minorFont') };
}

export function resolvePptxTypeface(value: string | null | undefined, theme: PptxThemeFonts, script: 'latin' | 'complex' | 'eastAsian' = 'latin', major = false): string {
  const token = value?.trim();
  const reference = token?.match(/^\+(mj|mn)-(lt|cs|ea)$/);
  if (token && !reference) return token;
  const set = reference ? (reference[1] === 'mj' ? theme.major : theme.minor) : (major ? theme.major : theme.minor);
  const slot = reference ? ({ lt: 'latin', cs: 'complex', ea: 'eastAsian' } as const)[reference[2] as 'lt' | 'cs' | 'ea'] : script;
  return (slot === 'complex' ? set.complex || set.scripts.Arab : slot === 'eastAsian' ? set.eastAsian : set.latin) || set.latin || set.complex || 'Geist';
}

function propertyFont(properties: readonly (Element | undefined)[], script: 'latin' | 'complex' | 'eastAsian', theme: PptxThemeFonts, major: boolean): string {
  const name = script === 'complex' ? 'cs' : script === 'eastAsian' ? 'ea' : 'latin';
  for (const propertiesNode of properties) {
    const explicit = child(propertiesNode, name)?.getAttribute('typeface');
    if (explicit?.trim()) return resolvePptxTypeface(explicit, theme, script, major);
  }
  // A run with only one explicit font still uses it when no script-specific font is declared.
  if (script !== 'latin') {
    const set = major ? theme.major : theme.minor;
    if (script === 'complex' && (set.complex || set.scripts.Arab)) return resolvePptxTypeface(undefined, theme, script, major);
    if (script === 'eastAsian' && set.eastAsian) return resolvePptxTypeface(undefined, theme, script, major);
    for (const propertiesNode of properties) {
      const explicit = child(propertiesNode, 'latin')?.getAttribute('typeface');
      if (explicit?.trim()) return resolvePptxTypeface(explicit, theme, script, major);
    }
  }
  return resolvePptxTypeface(undefined, theme, script, major);
}

/** Retain run-level font choices in the existing textStyle schema, including Arabic complex-script fonts. */
export function parsePptxText(body: Element, theme: PptxThemeFonts, inherited: readonly Element[] = [], major = false): TipTapDocument {
  const content: TipTapDocument[] = [];
  const list = child(body, 'lstStyle');
  for (const paragraph of [...body.children].filter(element => element.localName === 'p')) {
    const paragraphProperties = child(paragraph, 'pPr');
    const level = Number(paragraphProperties?.getAttribute('lvl') ?? 0) + 1;
    const defaults = [child(paragraphProperties, 'defRPr'), child(child(list, `lvl${level}pPr`), 'defRPr'), ...inherited];
    const alignment = paragraphProperties?.getAttribute('algn');
    const attrs: NonNullable<TipTapDocument['attrs']> = {};
    if (alignment) attrs.textAlign = alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : 'left';
    const rtl = paragraphProperties?.getAttribute('rtl');
    if (rtl === '1' || rtl === '0') attrs.dir = rtl === '1' ? 'rtl' : 'ltr';
    const runs: TipTapDocument[] = [];
    for (const run of paragraph.children) {
      if (run.localName === 'br') { runs.push({ type: 'hardBreak' }); continue; }
      if (run.localName !== 'r' && run.localName !== 'fld') continue;
      const value = child(run, 't')?.textContent ?? '';
      if (!value) continue;
      const properties = [child(run, 'rPr'), ...defaults];
      const attribute = (name: string): string | null => {
        for (const node of properties) if (node?.hasAttribute(name)) return node.getAttribute(name);
        return null;
      };
      let color: string | undefined;
      for (const node of properties) {
        const rgb = child(child(node, 'solidFill'), 'srgbClr')?.getAttribute('val');
        if (rgb) { color = `#${rgb}`; break; }
      }
      const size = attribute('sz');
      // Separate script spans only when needed; spaces and punctuation retain the surrounding run's Latin font.
      const segments = value.match(/[\u0590-\u08ff\u0900-\u0e7f\ufb1d-\ufdff\ufe70-\ufeff]+|[\u2e80-\u9fff\uac00-\ud7af]+|[^\u0590-\u08ff\u0900-\u0e7f\u2e80-\u9fff\uac00-\ud7af\ufb1d-\ufdff\ufe70-\ufeff]+/gu) ?? [value];
      for (const segment of segments) {
        const script = /^[\u0590-\u08ff\u0900-\u0e7f\ufb1d-\ufdff\ufe70-\ufeff]/u.test(segment) ? 'complex' : /^[\u2e80-\u9fff\uac00-\ud7af]/u.test(segment) ? 'eastAsian' : 'latin';
        const style: NonNullable<TipTapDocument['attrs']> = { fontFamily: propertyFont(properties, script, theme, major) };
        if (size && Number.isFinite(Number(size))) style.fontSize = `${Number(size) / 50}px`;
        if (color) style.color = color;
        const marks: NonNullable<TipTapDocument['marks']> = [{ type: 'textStyle', attrs: style }];
        if (attribute('b') === '1') marks.push({ type: 'bold' });
        if (attribute('i') === '1') marks.push({ type: 'italic' });
        if (attribute('u') && attribute('u') !== 'none') marks.push({ type: 'underline' });
        runs.push({ type: 'text', text: segment, marks });
      }
    }
    content.push({ type: 'paragraph', ...(Object.keys(attrs).length ? { attrs } : {}), content: runs });
  }
  return { type: 'doc', content };
}
