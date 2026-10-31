import type { Presentation, TipTapDocument } from '@/types/model';

/** Font family names are case insensitive; quotes belong to CSS, not the name. */
export function fontFamilyKey(value: string): string {
  return value.trim().replace(/^(['"])(.*)\1$/, '$2').trim().toLocaleLowerCase('en-US');
}

function familyTokens(value: string): string[] {
  return value.match(/(?:[^,"']|"[^"]*"|'[^']*')+/g) ?? [];
}

function visitRichText(node: TipTapDocument, visit: (attrs: Record<string, string | number | boolean | null>) => void): void {
  if (node.attrs) visit(node.attrs);
  for (const mark of node.marks ?? []) if (mark.attrs) visit(mark.attrs);
  for (const child of node.content ?? []) visitRichText(child, visit);
}

function visitPresentationFonts(document: Presentation, visit: (value: string) => string): void {
  document.theme.fonts.heading = visit(document.theme.fonts.heading);
  document.theme.fonts.body = visit(document.theme.fonts.body);
  const richText = (node: TipTapDocument) => visitRichText(node, attrs => {
    if (typeof attrs.fontFamily === 'string') attrs.fontFamily = visit(attrs.fontFamily);
  });
  for (const slide of document.slides) for (const element of slide.elements) {
    if (element.type === 'text') {
      element.fontFamily = visit(element.fontFamily);
      richText(element.content);
    } else if (element.type === 'shape' && element.text) richText(element.text);
    else if (element.type === 'table') for (const row of element.rows) for (const cell of row.cells) richText(cell.content);
  }
}

/** Read only: safe to run against the store's frozen document. */
export function referencedFontFamilies(document: Presentation): string[] {
  const names = new Map<string, string>();
  const collect = (value: string) => {
    for (const token of familyTokens(value)) {
      const name = token.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
      const key = fontFamilyKey(name);
      if (key && !names.has(key)) names.set(key, name);
    }
  };
  collect(document.theme.fonts.heading);
  collect(document.theme.fonts.body);
  const richText = (node: TipTapDocument) => {
    if (typeof node.attrs?.fontFamily === 'string') collect(node.attrs.fontFamily);
    for (const mark of node.marks ?? []) if (typeof mark.attrs?.fontFamily === 'string') collect(mark.attrs.fontFamily);
    for (const child of node.content ?? []) richText(child);
  };
  for (const slide of document.slides) for (const element of slide.elements) {
    if (element.type === 'text') { collect(element.fontFamily); richText(element.content); }
    else if (element.type === 'shape' && element.text) richText(element.text);
    else if (element.type === 'table') for (const row of element.rows) for (const cell of row.cells) richText(cell.content);
  }
  return [...names.values()];
}

export function missingFontFamilies(document: Presentation, available: (family: string) => boolean): string[] {
  return referencedFontFamilies(document).filter(family => !available(family));
}

/** Mutates only font fields, suitable for an editor.mutate transaction. */
export function replaceFontFamilies(document: Presentation, replacements: Readonly<Record<string, string>>): void {
  const byName = new Map(Object.entries(replacements).map(([from, to]) => [fontFamilyKey(from), to]));
  visitPresentationFonts(document, value => {
    let changed = false;
    const result = familyTokens(value).map(token => {
      const replacement = byName.get(fontFamilyKey(token));
      if (!replacement) return token;
      changed = true;
      const leading = token.match(/^\s*/)?.[0] ?? '';
      const trailing = token.match(/\s*$/)?.[0] ?? '';
      const quoted = token.trim().match(/^(['"])/)?.[1];
      const quote = quoted ?? (replacement.includes(',') ? '"' : '');
      const escaped = quote ? replacement.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`) : replacement;
      return `${leading}${quote}${escaped}${quote}${trailing}`;
    }).join(',');
    return changed ? result : value;
  });
}
