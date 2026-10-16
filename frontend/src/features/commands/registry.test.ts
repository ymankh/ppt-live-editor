import { describe, expect, it } from 'vitest';
import { commands, isEnabled, normalizeShortcut } from './registry';
import { useEditor } from '@/store/editor';
describe('command registry',()=>{
 it('disables selection commands until an element is selected',()=>{
  const command=commands.find(c=>c.id==='delete');if(!command)throw new Error('Delete command missing');
  useEditor.getState().select([]);expect(isEnabled(command)).toBe(false);
  const element=useEditor.getState().document.slides[0]?.elements[0];if(!element)throw new Error('Missing fixture element');
  useEditor.getState().select([element.id]);expect(isEnabled(command)).toBe(true);useEditor.getState().select([]);
 });
 it('normalizes Windows and macOS modifiers identically',()=>{
  expect(normalizeShortcut(new KeyboardEvent('keydown',{key:'z',ctrlKey:true}))).toBe('Ctrl+Z');
  expect(normalizeShortcut(new KeyboardEvent('keydown',{key:'z',metaKey:true,shiftKey:true}))).toBe('Ctrl+Shift+Z');
 });
});
