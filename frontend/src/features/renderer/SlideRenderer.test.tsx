import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createElement, createPresentation } from '@/lib/defaults';
import type { ImageElement } from '@/types/model';
import { SlideRenderer } from './SlideRenderer';

afterEach(cleanup);

it('removes image corner rounding for no mask and restores it when changing masks', () => {
  const document = createPresentation();
  const image = createElement('image');
  if (image.type !== 'image') throw new Error('Expected image fixture');
  const firstSlide = document.slides[0];
  if (!firstSlide) throw new Error('Expected slide fixture');
  const slide = { ...firstSlide, elements: [image] };
  image.cornerRadius = 32;
  image.clipShape = 'roundRect';
  const view = render(<SlideRenderer slide={slide} theme={document.theme} />);
  const radius = () => (view.container.querySelector('.renderer-image-frame') as HTMLElement).style.borderRadius;
  expect(radius()).toBe('32px');
  const changeMask = (clipShape: ImageElement['clipShape']) => {
    view.rerender(<SlideRenderer slide={{ ...slide, elements: [{ ...image, clipShape }] }} theme={document.theme} />);
  };
  changeMask('none');
  expect(Number.parseFloat(radius())).toBe(0);
  changeMask('ellipse');
  expect(radius()).toBe('50%');
  changeMask('roundRect');
  expect(radius()).toBe('32px');
});
