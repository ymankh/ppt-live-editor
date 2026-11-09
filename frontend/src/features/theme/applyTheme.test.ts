import { describe,expect,it } from 'vitest';
import { createPresentation,themes } from '@/lib/defaults';
import type { Slide, TextElement } from '@/types/model';
import { applyTheme } from './applyTheme';

const luminance = (color: string) => {
  const value = Number.parseInt(color.slice(1), 16);
  const [red = 0, green = 0, blue = 0] = [value >> 16, value >> 8, value].map(channel => {
    const level = (channel & 255) / 255;
    return level <= 0.03928 ? level / 12.92 : ((level + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};
const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
/** The color behind a text box: the top-most solid shape under its center, otherwise the slide. */
function backdrop(slide: Slide, text: TextElement): string {
  const x = text.x + text.width / 2, y = text.y + text.height / 2;
  const shape = slide.elements.slice(0, slide.elements.indexOf(text)).filter(element => element.type === 'shape' && element.fill.type === 'solid' && x >= element.x && x <= element.x + element.width && y >= element.y && y <= element.y + element.height).at(-1);
  const fill = shape?.type === 'shape' ? shape.fill : slide.background;
  if (fill.type !== 'solid') throw new Error('Expected solid fills in the starter deck');
  return fill.color;
}

describe('theme recoloring',()=>{
 it('recolors matching theme colors while preserving custom literals',()=>{
  const doc=createPresentation();const theme=themes[1];const slide=doc.slides[0];if(!theme||!slide)throw new Error('Missing theme fixture');
  slide.background={type:'solid',color:doc.theme.colors.background};const text=slide.elements.find(e=>e.type==='text');if(!text)throw new Error('Missing text fixture');text.color='#abcdef';
  applyTheme(doc,theme);
  expect(slide.background).toEqual({type:'solid',color:theme.colors.background});expect(text.color).toBe('#abcdef');expect(doc.theme.id).toBe(theme.id);
 });
 it('keeps every starter deck readable in every theme and language',()=>{
  for (const locale of ['en','ar'] as const) for (const theme of themes) {
   const doc=createPresentation(locale);applyTheme(doc,theme);
   for (const slide of doc.slides) for (const element of slide.elements) {
    if (element.type!=='text') continue;
    // Body and heading copy must meet WCAG AA; accent captions must at least stay clearly visible.
    expect(contrast(element.color,backdrop(slide,element)),`${theme.name} ${locale}: ${element.name}`).toBeGreaterThanOrEqual(element.color===theme.colors.text?4.5:2);
   }
  }
 });
 it('carries neutral literal surfaces across light and dark themes only',()=>{
  const [studio,midnight,sage]=themes;if(!studio||!midnight||!sage)throw new Error('Missing theme fixture');
  const doc=createPresentation('en');const cover=doc.slides[0];if(!cover)throw new Error('Missing cover');
  const surface=()=>cover.background.type==='solid'?cover.background.color:'';
  applyTheme(doc,sage);
  expect(surface()).toBe('#f7eee6');
  applyTheme(doc,midnight);
  expect(luminance(surface())).toBeLessThan(0.05);
  expect(contrast(surface(),midnight.colors.text)).toBeGreaterThan(10);
  applyTheme(doc,studio);
  expect(contrast(surface(),'#f7eee6')).toBeLessThan(1.1);
 });
});
