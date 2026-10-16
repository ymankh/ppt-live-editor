import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Maximize2, Minus, Plus, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditor } from '@/store/editor';
import { useView } from '@/store/view';
import { fitScale, resizeHandles, selectionBounds, type ResizeHandle } from '@/lib/geometry';
import { SlideRenderer } from '@/features/renderer/SlideRenderer';
import { useCanvasGestures, withGeometry } from './useCanvasGestures';
import './canvas.css';
import { strings } from "@/strings";


const handlePositions: Record<ResizeHandle, CSSProperties> = {
  nw: { left: 0, top: 0, cursor: strings.canvas.nwseResize }, n: { left: strings.common.value50, top: 0, cursor: strings.canvas.nsResize }, ne: { left: strings.common.value100, top: 0, cursor: strings.canvas.neswResize },
  e: { left: strings.common.value100, top: strings.common.value50, cursor: strings.canvas.ewResize }, se: { left: strings.common.value100, top: strings.common.value100, cursor: strings.canvas.nwseResize }, s: { left: strings.common.value50, top: strings.common.value100, cursor: strings.canvas.nsResize },
  sw: { left: 0, top: strings.common.value100, cursor: strings.canvas.neswResize }, w: { left: 0, top: strings.common.value50, cursor: strings.canvas.ewResize },
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
    node.addEventListener(strings.canvas.wheel, wheel, { passive: false });
    return () => node.removeEventListener(strings.canvas.wheel, wheel);
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
    const release = (event: KeyboardEvent) => { if (event.code === strings.canvas.space) setSpacePan(false); };
    const blur = () => setSpacePan(false);
    window.addEventListener(strings.common.keyup, release);
    window.addEventListener(strings.common.blur, blur);
    return () => { window.removeEventListener(strings.common.keyup, release); window.removeEventListener(strings.common.blur, blur); };
  }, []);
  const displaySlide = slide ? { ...slide, elements: [...slide.elements.map(element => {
    const box = gestures.transient[element.id];
    return box ? withGeometry(element, box) : element;
  }), ...gestures.previews] } : null;
  const selected = gestures.duplicate && gestures.previews.length ? gestures.previews : displaySlide?.elements.filter(element => selection.includes(element.id) && !element.hidden && !element.locked) ?? [];
  const bounds = selectionBounds(selected);
  const slideWidth = document.slideSize.width * scale, slideHeight = document.slideSize.height * scale;
  if (!slide || !displaySlide) return <div className={strings.canvas.canvasEmpty}>{strings.canvas.addASlideToBeginYourStory}</div>;
  const index = document.slides.findIndex(s => s.id === slide.id);
  return <section className={strings.canvas.canvasShell} aria-label={strings.canvas.slideCanvas}>
    <div className={strings.canvas.canvasTopbar}>
      <div className={strings.canvas.canvasSlideLabel}><span className={strings.canvas.canvasStatusDot} />{strings.common.slide_ff1e0604}{index + 1}<span className={strings.canvas.canvasSlideCount}>{strings.canvas.symbol}{document.slides.length}</span></div>
      <div className={strings.canvas.canvasTopbarRight}><span className={strings.canvas.canvasDimensions}>{document.slideSize.width}{strings.common.symbol_20dd86b3}{document.slideSize.height}</span><span className={strings.canvas.canvasToolbarDivider} />
        <Button variant={strings.common.ghost} size={strings.common.icon} className={strings.canvas.canvasBarButton} aria-label={strings.common.zoomOut} onClick={() => useEditor.getState().setZoom(Math.max(0.25, zoom - 0.1))}><Minus size={14} /></Button>
        <span className={strings.canvas.canvasZoomLabel}>{Math.round(zoom * 100)}{strings.common.symbol_bbf3f11c}</span>
        <Button variant={strings.common.ghost} size={strings.common.icon} className={strings.canvas.canvasBarButton} aria-label={strings.common.zoomIn} onClick={() => useEditor.getState().setZoom(Math.min(3, zoom + 0.1))}><Plus size={14} /></Button>
        <Button variant={strings.common.ghost} size={strings.common.icon} className={strings.canvas.canvasBarButton} aria-label={strings.canvas.fitSlideToWorkspace} title={strings.canvas.fitToWorkspace} onClick={() => { useEditor.getState().setZoom(1); gestures.resetPan(); if (viewport.current) { viewport.current.scrollLeft = 0; viewport.current.scrollTop = 0; } }}><Maximize2 size={14} /></Button>
      </div>
    </div>
    <div ref={viewport} className={`${strings.canvas.canvasWorkspace}${spacePan || tool === strings.canvas.hand || tool === strings.canvas.pan ? strings.canvas.canvasWorkspacePan : strings.common.empty}${!([strings.common.select, strings.canvas.hand, strings.canvas.pan] as readonly string[]).includes(tool) ? strings.canvas.canvasWorkspaceDraw : strings.common.empty}`} tabIndex={0} role={strings.canvas.application} aria-label={strings.canvas.presentationEditingAreaSelectAndDragElementsDoubleClick} onPointerDown={event => gestures.begin(event)} onPointerMove={gestures.move} onPointerUp={event => gestures.end(event)} onPointerCancel={event => gestures.end(event, true)} onLostPointerCapture={() => gestures.cancel()} onKeyDown={event => {
      if ((event.target as HTMLElement).closest(strings.canvas.inputTextareaContenteditableTrueDataEditingTrue)) return;
      if ((event.target as HTMLElement).closest(strings.canvas.rendererRichTextRoleButton) && event.key === strings.canvas.tab) return;
      if ((event.key === strings.common.enter || event.key === strings.common.f2) && event.target === event.currentTarget && selection.length === 1) {
        const id = selection[0];
        const editable = id ? frame.current?.querySelector<HTMLElement>(`${strings.common.dataElementId}${CSS.escape(id)}${strings.canvas.rendererRichTextRoleButton_442156c4}`) : null;
        if (editable) { event.preventDefault(); event.stopPropagation(); editable.focus(); return; }
      }
      if (event.code === strings.canvas.space) { event.preventDefault(); event.stopPropagation(); setSpacePan(true); return; }
      if (event.key === strings.common.escape) { gestures.cancel(); useEditor.getState().select([]); event.stopPropagation(); return; }
      if (event.key === strings.canvas.tab) {
        event.preventDefault(); event.stopPropagation();
        const elements = slide.elements.filter(element => !element.hidden && !element.locked);
        const index = elements.findIndex(element => element.id === selection.at(-1));
        const next = elements.length ? elements[(index + (event.shiftKey ? -1 : 1) + elements.length) % elements.length] : undefined;
        const target = event.shiftKey && index < 0 ? elements.at(-1) : next;
        useEditor.getState().select(target ? [target.id] : []);
        return;
      }
      if (!([strings.common.arrowLeft_48e61e2d, strings.common.arrowRight_8e2f7ffb, strings.common.arrowUp_12204d1d, strings.common.arrowDown_9660fb86] as readonly string[]).includes(event.key) || !selection.length) return;
      event.preventDefault(); event.stopPropagation();
      const distance = event.shiftKey ? 10 : 1;
      const dx = event.key === strings.common.arrowLeft_48e61e2d ? -distance : event.key === strings.common.arrowRight_8e2f7ffb ? distance : 0;
      const dy = event.key === strings.common.arrowUp_12204d1d ? -distance : event.key === strings.common.arrowDown_9660fb86 ? distance : 0;
      useEditor.getState().mutate(strings.canvas.nudgeElements, draft => {
        const current = draft.slides.find(s => s.id === activeSlideId);
        for (const element of current?.elements ?? []) if (selection.includes(element.id) && !element.locked) { element.x += dx; element.y += dy; }
      });
    }}>
      <div className={strings.canvas.canvasStageArea} style={{ width: Math.max(size.width, slideWidth + 128), height: Math.max(size.height, slideHeight + 132) }}>
        <div ref={frame} className={strings.canvas.canvasSlideFrame} style={{ width: slideWidth, height: slideHeight, transform: `${strings.canvas.translate}${gestures.panOffset.x}${strings.canvas.px}${gestures.panOffset.y}${strings.canvas.px_fdae9532}` }}>
          {rulers&&<><div className={strings.canvas.canvasRulerCanvasRulerHorizontal} aria-hidden={strings.common.true}>{Array.from({length:9},(_,i)=><span key={i} style={{left:`${i/8*100}${strings.common.symbol_bbf3f11c}`}}><i/>{Math.round(i*document.slideSize.width/8)}</span>)}</div>
          <div className={strings.canvas.canvasRulerCanvasRulerVertical} aria-hidden={strings.common.true}>{Array.from({length:7},(_,i)=><span key={i} style={{top:`${i/6*100}${strings.common.symbol_bbf3f11c}`}}><i/>{Math.round(i*document.slideSize.height/6)}</span>)}</div></>}
          <SlideRenderer slide={displaySlide} theme={document.theme} logicalSize={document.slideSize} width={slideWidth} interactive />
          {grid && <div className={strings.canvas.canvasGrid} aria-hidden={strings.common.true} style={{ backgroundSize: `${gridSpacing * scale}${strings.common.px_2e0dd922}${gridSpacing * scale}${strings.common.px}` }} />}
          {gestures.guides.map(guide => <div key={guide.axis} aria-hidden={strings.common.true} className={`${strings.canvas.canvasGuideCanvasGuide}${guide.axis}`} style={guide.axis === strings.common.x ? { left: guide.position * scale } : { top: guide.position * scale }} />)}
          {bounds && <div className={strings.canvas.canvasSelection} style={{ left: bounds.x * scale, top: bounds.y * scale, width: bounds.width * scale, height: bounds.height * scale, transform: `${strings.common.rotate}${bounds.rotation}${strings.common.deg}` }}>
            <div className={strings.canvas.canvasRotationStem} /><button className={strings.canvas.canvasRotationHandle} aria-label={strings.canvas.rotateSelectionDoubleClickToResetRotation} title={strings.canvas.dragToRotateDoubleClickToReset} onDoubleClick={event => {
              event.stopPropagation();
              useEditor.getState().mutate(strings.canvas.resetRotation, draft => {
                const current = draft.slides.find(item => item.id === activeSlideId);
                for (const element of current?.elements ?? []) if (selection.includes(element.id) && !element.locked) element.rotation = 0;
              });
            }} onPointerDown={event => { event.stopPropagation(); if (viewport.current) gestures.begin(event, strings.canvas.rotate, undefined, viewport.current); }} />
            {resizeHandles.map(handle => <button key={handle} className={strings.canvas.canvasResizeHandle} style={handlePositions[handle]} aria-label={`${strings.canvas.resize}${handle}`} onPointerDown={event => {
              event.stopPropagation(); if (viewport.current) gestures.begin(event, strings.common.resize, handle, viewport.current);
            }} />)}
            <span className={strings.canvas.canvasSelectionSize}>{Math.round(bounds.width)}{strings.common.symbol_20dd86b3}{Math.round(bounds.height)}</span>
          </div>}
          {gestures.marquee && <div className={strings.canvas.canvasMarquee} style={{ left: gestures.marquee.x * scale, top: gestures.marquee.y * scale, width: gestures.marquee.width * scale, height: gestures.marquee.height * scale }} />}
        </div>
      </div>
    </div>
    <div className={strings.canvas.canvasHint}><MousePointer2 size={12} /><span>{selection.length ? strings.canvas.dragToMoveShiftToConstrainDoubleClickTo : strings.canvas.clickToSelectDragToSelectMultipleDoubleClick}</span><span className={strings.canvas.canvasHintRight}>{selected.length ? `${selected.length}${strings.canvas.selected}` : strings.canvas.makeRoomForYourNextBigIdea}</span></div>
  </section>;
}
