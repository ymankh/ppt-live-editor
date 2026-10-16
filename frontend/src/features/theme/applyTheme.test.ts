import { describe,expect,it } from 'vitest';
import { createPresentation,themes } from '@/lib/defaults';
import { applyTheme } from './applyTheme';
describe('theme recoloring',()=>{
 it('recolors matching theme colors while preserving custom literals',()=>{
  const doc=createPresentation();const theme=themes[1];const slide=doc.slides[0];if(!theme||!slide)throw new Error('Missing theme fixture');
  slide.background={type:'solid',color:doc.theme.colors.background};const text=slide.elements.find(e=>e.type==='text');if(!text)throw new Error('Missing text fixture');text.color='#abcdef';
  applyTheme(doc,theme);
  expect(slide.background).toEqual({type:'solid',color:theme.colors.background});expect(text.color).toBe('#abcdef');expect(doc.theme.id).toBe(theme.id);
 });
});
