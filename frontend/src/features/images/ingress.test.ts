import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPresentation } from '@/lib/defaults';
import { useLocale } from '@/features/localization/locale';
import { useEditor } from '@/store/editor';
import type { TextElement } from '@/types/model';
import { pasteText } from './ingress';

vi.mock('@/features/persistence/repository', () => ({ getProject: vi.fn(), getLastProject: vi.fn(), saveProject: vi.fn().mockResolvedValue(undefined) }));

function pastedElement(): TextElement {
  const state = useEditor.getState();
  const element = state.document.slides.find(slide => slide.id === state.activeSlideId)?.elements.at(-1);
  if (element?.type !== 'text') throw new Error('Expected the pasted text element');
  return element;
}

beforeEach(() => {
  useEditor.getState().cancelTransaction();
  useEditor.getState().setDocument(createPresentation('en'));
});
afterEach(() => useLocale.getState().setLocale('en'));

describe('pasted text', () => {
  it('aligns by its own reading direction in either interface language', () => {
    for (const locale of ['en', 'ar'] as const) {
      useLocale.getState().setLocale(locale);
      pasteText('Quarterly results');
      expect(pastedElement().align).toBe('left');
      pasteText('نتائج الربع الثالث');
      expect(pastedElement().align).toBe('right');
    }
  });
});
