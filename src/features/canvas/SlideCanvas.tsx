import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Maximize2, Minus, Plus, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditor } from '@/store/editor';
import { useView } from '@/store/view';
import { fitScale, resizeHandles, selectionBounds, type ResizeHandle } from '@/lib/geometry';
import { SlideRenderer } from '@/features/renderer/SlideRenderer';
import { useCanvasGestures, withGeometry } from './useCanvasGestures';
import './canvas.css';

const handlePositions: Record<ResizeHandle, CSSProperties> = {
  nw: { left: 0, top: 0, cursor: 'nwse-resize' }, n: { left: '50%', top: 0, cursor: 'ns-resize' }, ne: { left: '100%', top: 0, cursor: 'nesw-resize' },
  e: { left: '100%', top: '50%', cursor: 'ew-resize' }, se: { left: '100%', top: '100%', cursor: 'nwse-resize' }, s: { left: '50%', top: '100%', cursor: 'ns-resize' },
  sw: { left: 0, top: '100%', cursor: 'nesw-resize' }, w: { left: 0, top: '50%', cursor: 'ew-resize' },
};
export function SlideCanvas() {
  const document = useEditor(state => state.document);
  const activeSlideId = useEditor(state => state.activeSlideId);
  const selection = useEditor(state => state.selection);
  const zoom = useEditor(state => state.zoom);
  const tool = useEditor(state => state.tool);
  const grid = useView(state => state.grid);
  const rulers = useView(state => state.rulers);
  const gridSpacing = useView(state => state.gridSpacing);
  const [spacePan, setSpacePan] = useState(false);
  const zoomAnchor = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const slide = document.slides.find(s => s.id === activeSlideId) ?? document.slides[0];
  const viewport = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 680 });
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const fit = fitScale(Math.max(1, size.width - 128), Math.max(1, size.height - 132),document.slideSize.width,document.slideSize.height);
  const scale = fit * zoom;
  const gestures = useCanvasGestures(slide?.elements ?? [], scale, frame, spacePan);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = frame.current?.getBoundingClientRect();
      const zoom = useEditor.getState().zoom;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientHeight : 1);
      const nextZoom = Math.max(0.25, Math.min(3, zoom * Math.exp(-delta * 0.0015)));
      if (nextZoom === zoom) return;
      if (rect) zoomAnchor.current = { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale, clientX: event.clientX, clientY: event.clientY };
      useEditor.getState().setZoom(nextZoom);
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, [scale, slide?.id]);
  useLayoutEffect(() => {
    const anchor = zoomAnchor.current;
    const node = viewport.current;
    const rect = frame.current?.getBoundingClientRect();
    if (anchor && node && rect) {
      node.scrollLeft += rect.left + anchor.x * scale - anchor.clientX;
      node.scrollTop += rect.top + anchor.y * scale - anchor.clientY;
      zoomAnchor.current = null;
    }
  }, [scale]);
  useEffect(() => {
    const release = (event: KeyboardEvent) => { if (event.code === 'Space') setSpacePan(false); };
    const blur = () => setSpacePan(false);
    window.addEventListener('keyup', release);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keyup', release); window.removeEventListener('blur', blur); };
  }, []);
  const displaySlide = slide ? { ...slide, elements: [...slide.elements.map(element => {
    const box = gestures.transient[element.id];
    return box ? withGeometry(element, box) : element;
  }), ...gestures.previews] } : null;
  const selected = gestures.duplicate && gestures.previews.length ? gestures.previews : displaySlide?.elements.filter(element => selection.includes(element.id) && !element.hidden && !element.locked) ?? [];
  const bounds = selectionBounds(selected);
  const slideWidth = document.slideSize.width * scale, slideHeight = document.slideSize.height * scale;
  if (!slide || !displaySlide) return <div className="canvas-empty">Add a slide to begin your story.</div>;
  const index = document.slides.findIndex(s => s.id === slide.id);
  return <section className="canvas-shell" aria-label="Slide canvas">
    <div className="canvas-topbar">
      <div className="canvas-slide-label"><span className="canvas-status-dot" />Slide {index + 1}<span className="canvas-slide-count">/ {document.slides.length}</span></div>
      <div className="canvas-topbar-right"><span className="canvas-dimensions">{document.slideSize.width} × {document.slideSize.height}</span><span className="canvas-toolbar-divider" />
        <Button variant="ghost" size="icon" className="canvas-bar-button" aria-label="Zoom out" onClick={() => useEditor.getState().setZoom(Math.max(0.25, zoom - 0.1))}><Minus size={14} /></Button>
        <span className="canvas-zoom-label">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="canvas-bar-button" aria-label="Zoom in" onClick={() => useEditor.getState().setZoom(Math.min(3, zoom + 0.1))}><Plus size={14} /></Button>
        <Button variant="ghost" size="icon" className="canvas-bar-button" aria-label="Fit slide to workspace" title="Fit to workspace" onClick={() => { useEditor.getState().setZoom(1); gestures.resetPan(); if (viewport.current) { viewport.current.scrollLeft = 0; viewport.current.scrollTop = 0; } }}><Maximize2 size={14} /></Button>
      </div>
    </div>
    <div ref={viewport} className={`canvas-workspace${spacePan || tool === 'hand' || tool === 'pan' ? ' canvas-workspace-pan' : ''}${!['select', 'hand', 'pan'].includes(tool) ? ' canvas-workspace-draw' : ''}`} tabIndex={0} role="application" aria-label="Presentation editing area. Select and drag elements, double-click text to edit, Tab to cycle, Space to pan, or Control and wheel to zoom." onPointerDown={event => gestures.begin(event)} onPointerMove={gestures.move} onPointerUp={event => gestures.end(event)} onPointerCancel={event => gestures.end(event, true)} onLostPointerCapture={() => gestures.cancel()} onKeyDown={event => {
      if ((event.target as HTMLElement).closest('input, textarea, [contenteditable="true"], [data-editing="true"]')) return;
      if ((event.target as HTMLElement).closest('.renderer-rich-text[role="button"]') && event.key === 'Tab') return;
      if ((event.key === 'Enter' || event.key === 'F2') && event.target === event.currentTarget && selection.length === 1) {
        const id = selection[0];
        const editable = id ? frame.current?.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(id)}"] .renderer-rich-text[role="button"]`) : null;
        if (editable) { event.preventDefault(); event.stopPropagation(); editable.focus(); return; }
      }
      if (event.code === 'Space') { event.preventDefault(); event.stopPropagation(); setSpacePan(true); return; }
      if (event.key === 'Escape') { gestures.cancel(); useEditor.getState().select([]); event.stopPropagation(); return; }
      if (event.key === 'Tab') {
        event.preventDefault(); event.stopPropagation();
        const elements = slide.elements.filter(element => !element.hidden && !element.locked);
        const index = elements.findIndex(element => element.id === selection.at(-1));
        const next = elements.length ? elements[(index + (event.shiftKey ? -1 : 1) + elements.length) % elements.length] : undefined;
        const target = event.shiftKey && index < 0 ? elements.at(-1) : next;
        useEditor.getState().select(target ? [target.id] : []);
        return;
      }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || !selection.length) return;
      event.preventDefault(); event.stopPropagation();
      const distance = event.shiftKey ? 10 : 1;
      const dx = event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0;
      const dy = event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0;
      useEditor.getState().mutate('Nudge elements', draft => {
        const current = draft.slides.find(s => s.id === activeSlideId);
        for (const element of current?.elements ?? []) if (selection.includes(element.id) && !element.locked) { element.x += dx; element.y += dy; }
      });
    }}>
      <div className="canvas-stage-area" style={{ width: Math.max(size.width, slideWidth + 128), height: Math.max(size.height, slideHeight + 132) }}>
        <div ref={frame} className="canvas-slide-frame" style={{ width: slideWidth, height: slideHeight, transform: `translate(${gestures.panOffset.x}px, ${gestures.panOffset.y}px)` }}>
          {rulers&&<><div className="canvas-ruler canvas-ruler-horizontal" aria-hidden="true">{Array.from({length:9},(_,i)=><span key={i} style={{left:`${i/8*100}%`}}><i/>{Math.round(i*document.slideSize.width/8)}</span>)}</div>
          <div className="canvas-ruler canvas-ruler-vertical" aria-hidden="true">{Array.from({length:7},(_,i)=><span key={i} style={{top:`${i/6*100}%`}}><i/>{Math.round(i*document.slideSize.height/6)}</span>)}</div></>}
          <SlideRenderer slide={displaySlide} theme={document.theme} logicalSize={document.slideSize} width={slideWidth} interactive />
          {grid && <div className="canvas-grid" aria-hidden="true" style={{ backgroundSize: `${gridSpacing * scale}px ${gridSpacing * scale}px` }} />}
          {gestures.guides.map(guide => <div key={guide.axis} aria-hidden="true" className={`canvas-guide canvas-guide-${guide.axis}`} style={guide.axis === 'x' ? { left: guide.position * scale } : { top: guide.position * scale }} />)}
          {bounds && <div className="canvas-selection" style={{ left: bounds.x * scale, top: bounds.y * scale, width: bounds.width * scale, height: bounds.height * scale, transform: `rotate(${bounds.rotation}deg)` }}>
            <div className="canvas-rotation-stem" /><button className="canvas-rotation-handle" aria-label="Rotate selection. Double-click to reset rotation." title="Drag to rotate · Double-click to reset" onDoubleClick={event => {
              event.stopPropagation();
              useEditor.getState().mutate('Reset rotation', draft => {
                const current = draft.slides.find(item => item.id === activeSlideId);
                for (const element of current?.elements ?? []) if (selection.includes(element.id) && !element.locked) element.rotation = 0;
              });
            }} onPointerDown={event => { event.stopPropagation(); if (viewport.current) gestures.begin(event, 'rotate', undefined, viewport.current); }} />
            {resizeHandles.map(handle => <button key={handle} className="canvas-resize-handle" style={handlePositions[handle]} aria-label={`Resize ${handle}`} onPointerDown={event => {
              event.stopPropagation(); if (viewport.current) gestures.begin(event, 'resize', handle, viewport.current);
            }} />)}
            <span className="canvas-selection-size">{Math.round(bounds.width)} × {Math.round(bounds.height)}</span>
          </div>}
          {gestures.marquee && <div className="canvas-marquee" style={{ left: gestures.marquee.x * scale, top: gestures.marquee.y * scale, width: gestures.marquee.width * scale, height: gestures.marquee.height * scale }} />}
        </div>
      </div>
    </div>
    <div className="canvas-hint"><MousePointer2 size={12} /><span>{selection.length ? 'Drag to move · Shift to constrain · Double-click to edit' : 'Click to select · Drag to select multiple · Double-click text to edit'}</span><span className="canvas-hint-right">{selected.length ? `${selected.length} selected` : 'Make room for your next big idea.'}</span></div>
  </section>;
}
