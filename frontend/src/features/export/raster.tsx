import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { toJpeg, toPng } from 'html-to-image';
import { SlideRenderer } from '@/features/renderer/SlideRenderer';
import type { Presentation, Slide } from '@/types/model';
import { assetReferences, getAsset } from '@/features/persistence/repository';
import { blobDataUrl, replaceAssets } from './assets';
import { strings } from "@/strings";


export interface RasterOptions { format?: 'png' | 'jpeg'; scale?: number }
export async function rasterizeSlide(presentation: Presentation, slide: Slide, options: RasterOptions = {}): Promise<string> {
  const replacements: Record<string, string> = {};
  for (const reference of assetReferences({ ...presentation, slides: [slide] })) {
    const stored = await getAsset(reference);
    if (stored) replacements[reference] = await blobDataUrl(stored);
  }
  let resolvedSlide = slide;
  if (Object.keys(replacements).length) {
    resolvedSlide = structuredClone(slide);
    replaceAssets({ ...presentation, slides: [resolvedSlide] }, replacements);
  }
  const host = document.createElement(strings.export.div);
  host.style.cssText = strings.export.positionFixedLeft30000pxTop0PointerEventsNone;
  const width = presentation.slideSize.width;
  const height = presentation.slideSize.height;
  host.style.width = `${width}${strings.common.px}`; host.style.height = `${height}${strings.common.px}`;
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<SlideRenderer slide={resolvedSlide} theme={presentation.theme} logicalSize={presentation.slideSize} width={width} />));
    await document.fonts.ready;
    await Promise.all([...host.querySelectorAll(strings.export.img)].map(async image => {
      if (!image.complete) await image.decode();
      if (!image.naturalWidth) throw new Error(strings.export.aSlideImageCouldNotBeLoaded);
    }));
    const { promise, resolve } = Promise.withResolvers<undefined>();
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)));
    await promise;
    const render = options.format === strings.export.jpeg ? toJpeg : toPng;
    return await render(host, { width, height, pixelRatio: options.scale ?? 1, cacheBust: false, skipAutoScale: true, backgroundColor: strings.common.colorffffff, quality: 0.95 });
  } finally {
    root.unmount(); host.remove();
  }
}
