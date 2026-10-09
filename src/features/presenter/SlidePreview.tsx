import { useEffect, useRef, useState } from 'react';
import { SlideRenderer } from '@/features/renderer/SlideRenderer';
import type { Slide, Theme } from '@/types/model';
import { useEditor } from '@/store/editor';

export function SlidePreview({ slide, theme, maxWidth }: { slide: Slide; theme: Theme; maxWidth: number }) {
  const logicalSize=useEditor(state=>state.document.slideSize);
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(maxWidth);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setWidth(Math.min(maxWidth, entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [maxWidth]);
  return <div ref={host} style={{width:'100%'}}><SlideRenderer slide={slide} theme={theme} logicalSize={logicalSize} width={width}/></div>;
}
