import { describe, expect, it } from 'vitest';
import { arabic } from './ar';

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe('Arabic catalogue', () => {
  it('keeps every {placeholder} of the English template', () => {
    for (const [english, translation] of Object.entries(arabic)) expect(placeholders(translation), english).toEqual(placeholders(english));
  });

  it('keeps the edge spaces that join translated fragments', () => {
    for (const [english, translation] of Object.entries(arabic)) {
      expect(/^\s/.test(translation), english).toBe(/^\s/.test(english));
      expect(/\s$/.test(translation), english).toBe(/\s$/.test(english));
    }
  });

  it('uses Western digits', () => {
    for (const [english, translation] of Object.entries(arabic)) expect(translation, english).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
  });
});
