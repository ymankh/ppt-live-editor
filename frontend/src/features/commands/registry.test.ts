import { describe, expect, it } from 'vitest';
import { commands, isEnabled, normalizeShortcut } from './registry';
import { useEditor } from '@/store/editor';
import { createElement, createPresentation, createSlide } from '@/lib/defaults';
import { strings } from '@/strings';
import type { SlideElement } from '@/types/model';

function selectElements(elements: SlideElement[]) {
 const document=createPresentation(),slide=createSlide();
 slide.elements=elements;document.slides=[slide];
 useEditor.getState().setDocument(document);
 useEditor.getState().select(elements.map(element=>element.id));
}
describe('command registry',()=>{
 it('disables selection commands until an element is selected',()=>{
  const command=commands.find(c=>c.id==='delete');if(!command)throw new Error('Delete command missing');
  useEditor.getState().select([]);expect(isEnabled(command)).toBe(false);
  const element=useEditor.getState().document.slides[0]?.elements[0];if(!element)throw new Error('Missing fixture element');
  useEditor.getState().select([element.id]);expect(isEnabled(command)).toBe(true);useEditor.getState().select([]);
 });
 describe.each([strings.commands.flipH,strings.commands.flipV])('%s applicability',id=>{
  const command=commands.find(command=>command.id===id);
  if(!command)throw new Error('Flip command missing');
  it.each(['text','line','table','chart'] as const)('disables %s-only selections',type=>{
   selectElements([createElement(type)]);
   expect(isEnabled(command)).toBe(false);
  });
  it.each(['shape','image'] as const)('enables unlocked %s selections',type=>{
   selectElements([createElement(type)]);
   expect(isEnabled(command)).toBe(true);
  });
  it('disables empty and locked-only selections',()=>{
   selectElements([]);
   expect(isEnabled(command)).toBe(false);
   selectElements([{...createElement('shape'),locked:true},{...createElement('image'),locked:true}]);
   expect(isEnabled(command)).toBe(false);
  });
  it('disables unsupported selections mixed with locked supported elements',()=>{
   selectElements([createElement('text'),{...createElement('shape'),locked:true}]);
   expect(isEnabled(command)).toBe(false);
  });
  it('flips only the supported unlocked subset of a mixed selection',()=>{
   const shape=createElement('shape'),image=createElement('image'),locked={...createElement('image'),locked:true},text=createElement('text');
   selectElements([shape,image,locked,text]);
   expect(isEnabled(command)).toBe(true);
   command.run();
   const state=useEditor.getState(),elements=state.document.slides.find(slide=>slide.id===state.activeSlideId)?.elements;
   expect(elements).toEqual([
    {...shape,[id===strings.commands.flipH?'flipH':'flipV']:true},
    {...image,[id===strings.commands.flipH?'flipH':'flipV']:true},
    locked,text,
   ]);
  });
 });
 it('normalizes Windows and macOS modifiers identically',()=>{
  expect(normalizeShortcut(new KeyboardEvent('keydown',{key:'z',ctrlKey:true}))).toBe('Ctrl+Z');
  expect(normalizeShortcut(new KeyboardEvent('keydown',{key:'z',metaKey:true,shiftKey:true}))).toBe('Ctrl+Shift+Z');
 });
});
