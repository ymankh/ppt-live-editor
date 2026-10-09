import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, Expand, Grid2X2, Monitor, MousePointer2, PenLine, X } from 'lucide-react';
import { toast } from 'sonner';
import { useEditor } from '@/store/editor';
import { SlideRenderer } from '@/features/renderer/SlideRenderer';
import { fitSlide } from '@/lib/units';
import type { Point } from '@/types/model';
import { animateStep, animationGroups, transitionFrames } from './animations';
import { channelName, playerMessageSchema } from './channel';
import './player.css';
import { strings } from "@/strings";


type Stroke = { slideId: string; points: Point[] };
export function Player() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const startSlide = Math.max(0, Number(search.get(strings.common.slide)) || 0);
  const navigate = useNavigate();
  const presentation = useEditor(state => state.document);
  const loadProject = useEditor(state => state.loadProject);
  const saveProject = useEditor(state => state.saveProject);
  const slides = useMemo(() => presentation.slides.filter(slide => !slide.skipped), [presentation.slides]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [blackout, setBlackout] = useState<'black' | 'white' | null>(null);
  const [overview, setOverview] = useState(false);
  const [selectedTool, setTool] = useState<'pointer' | 'laser' | 'pen'>(strings.presenter.pointer);
  const [heldTool, setHeldTool] = useState<'laser' | 'pen' | null>(null);
  const tool = heldTool ?? selectedTool;
  const [autoAdvance, setAutoAdvance] = useState(0);
  const [jumpDigits, setJumpDigits] = useState<string>(strings.common.empty);
  const numericJump = useRef<string>(strings.common.empty);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [startedAt, setStartedAt] = useState(Date.now);
  const drawing = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const slide = slides[Math.min(index, slides.length - 1)];
  const groups = useMemo(() => slide ? animationGroups(slide) : [], [slide]);
  const scale = fitSlide(size.width, size.height,presentation.slideSize.width,presentation.slideSize.height);
  useEffect(() => { if (id && id !== presentation.id) void loadProject(id).catch((error: unknown) => toast.error(String(error))); }, [id, presentation.id, loadProject]);
  useEffect(() => {
    const target = presentation.slides.slice(0, startSlide).filter(item => !item.skipped).length;
    setIndex(target); setStep(0);
  }, [presentation.id, startSlide]);
  useEffect(() => {
    const resize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener(strings.common.resize, resize); return () => window.removeEventListener(strings.common.resize, resize);
  }, []);
  useEffect(() => {
    if (!slide || !content.current) return;
    const animations: globalThis.Animation[] = [];
    for (const element of slide.elements) {
      const node = content.current.querySelector<HTMLElement>(`${strings.common.dataElementId}${CSS.escape(element.id)}${strings.presenter.symbol_9980a615}`);
      if (!node) continue;
      node.style.visibility = element.animations.some(animation => animation.category === strings.common.entrance) ? strings.common.hidden : strings.common.empty;
      const link = content.current.querySelector<HTMLElement>(`${strings.presenter.dataLinkElement}${CSS.escape(element.id)}${strings.presenter.symbol_9980a615}`);
      if (link) link.style.visibility = node.style.visibility;
    }
    for (let groupIndex = 0; groupIndex <= step; groupIndex++) for (const item of groups[groupIndex] ?? []) {
      const node = content.current.querySelector<HTMLElement>(`${strings.common.dataElementId}${CSS.escape(item.elementId)}${strings.presenter.symbol_9980a615}`);
      if (!node) continue;
      node.style.visibility = strings.common.empty;
      const animation = animateStep(node, item.animation, groupIndex < step ? 0 : item.offset);
      const link = content.current.querySelector<HTMLElement>(`${strings.presenter.dataLinkElement}${CSS.escape(item.elementId)}${strings.presenter.symbol_9980a615}`);
      if (link) {
        link.style.visibility = strings.common.empty;
        animation.onfinish = () => { if (item.animation.category === strings.common.exit) link.style.visibility = strings.common.hidden; };
      }
      if (groupIndex < step) animation.finish();
      animations.push(animation);
    }
    return () => animations.forEach(animation => animation.cancel());
  }, [slide, groups, step]);
  useEffect(() => {
    if (!slide || !content.current || slide.transition.effect === strings.common.none) return;
    const animation = content.current.animate(transitionFrames[slide.transition.effect], { duration: slide.transition.duration * 1000, easing: strings.presenter.easeOut });
    return () => animation.cancel();
  }, [slide]);
  const jump = useCallback((nextIndex: number) => { setIndex(Math.max(0, Math.min(slides.length - 1, nextIndex))); setStep(0); setBlackout(null); setOverview(false); }, [slides.length]);
  const next = useCallback(() => { if (blackout) setBlackout(null); else if (step < groups.length - 1) setStep(step + 1); else jump(index + 1); }, [blackout, step, groups.length, jump, index]);
  const previous = useCallback(() => { if (blackout) setBlackout(null); else if (step > 0) setStep(step - 1); else jump(index - 1); }, [blackout, step, jump, index]);
  const fullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => toast.error(strings.presenter.couldNotExitFullscreen));
    else void stage.current?.requestFullscreen().catch(() => toast.error(strings.presenter.fullscreenIsUnavailableInThisBrowser));
  }, []);
  useEffect(() => {
    if (!autoAdvance || blackout || overview || heldTool || tool === strings.presenter.pen || !slide) return;
    if (index >= slides.length - 1 && step >= groups.length - 1) return;
    const timer = window.setTimeout(next, autoAdvance * 1000);
    return () => window.clearTimeout(timer);
  }, [autoAdvance, blackout, overview, heldTool, tool, slide, index, slides.length, step, groups.length, next]);
  useEffect(() => {
    const connection = new BroadcastChannel(channelName(id ?? presentation.id)); channel.current = connection;
    connection.onmessage = event => {
      const parsed = playerMessageSchema.safeParse(event.data);
      if (!parsed.success) return;
      const message = parsed.data;
      if (message.type === strings.presenter.hello) connection.postMessage({ type: strings.presenter.state, slideId: slide?.id ?? strings.common.empty, step, startedAt, blackout });
      if (message.type !== strings.common.command) return;
      if (message.slideId) { const target = slides.findIndex(item => item.id === message.slideId); if (target >= 0) jump(target); return; }
      if (message.command === strings.presenter.next) next();
      if (message.command === strings.presenter.previous) previous();
      if (message.command === strings.presenter.black) setBlackout(strings.presenter.black);
      if (message.command === strings.presenter.white) setBlackout(strings.presenter.white);
      if (message.command === strings.presenter.resume) setBlackout(null);
      if (message.command === strings.presenter.restart) setStartedAt(Date.now());
    };
    connection.postMessage({ type: strings.presenter.state, slideId: slide?.id ?? strings.common.empty, step, startedAt, blackout });
    return () => { connection.close(); channel.current = null; };
  }, [id, presentation.id, slide?.id, slides, step, startedAt, blackout, jump, next, previous]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLElement && event.target.closest(strings.presenter.inputTextareaSelectContenteditableTrue)) return;
      const key = event.key.toLowerCase();
      if (/^\d$/.test(key)) { numericJump.current = `${numericJump.current}${key}`.slice(-4); setJumpDigits(numericJump.current); }
      else if (key === strings.presenter.enter_e08d706b && numericJump.current) {
        const number = Number(numericJump.current);
        const target = slides.findIndex(item => item.id === presentation.slides[number - 1]?.id);
        if (target >= 0) jump(target);
        else toast.error(strings.presenter.thatSlideIsUnavailableOrSkipped);
        numericJump.current = strings.common.empty; setJumpDigits(strings.common.empty);
      }
      else if (([strings.presenter.arrowright, strings.presenter.arrowdown, strings.common.space, strings.presenter.enter_e08d706b, strings.presenter.pagedown] as readonly string[]).includes(key)) next();
      else if (([strings.presenter.arrowleft, strings.presenter.arrowup, strings.presenter.pageup] as readonly string[]).includes(key)) previous();
      else if (key === strings.presenter.home) jump(0);
      else if (key === strings.common.end) jump(slides.length - 1);
      else if (key === strings.common.b || key === strings.common.symbol_cdb4ee2a) setBlackout(value => value === strings.presenter.black ? null : strings.presenter.black);
      else if (key === strings.common.w || key === strings.common.symbol_d03502c4) setBlackout(value => value === strings.presenter.white ? null : strings.presenter.white);
      else if (key === strings.presenter.g) { if (!event.repeat) setOverview(value => !value); }
      else if (key === strings.presenter.l) setHeldTool(strings.presenter.laser);
      else if (key === strings.common.p) setHeldTool(strings.presenter.pen);
      else if (key === strings.common.e) setStrokes([]);
      else if (key === strings.presenter.f) fullscreen();
      else if (key === strings.presenter.escape) { numericJump.current = strings.common.empty; setJumpDigits(strings.common.empty); if (overview) setOverview(false); else if (blackout) setBlackout(null); else void navigate(`${strings.common.edit}${presentation.id}`); }
      else return;
      event.preventDefault(); event.stopPropagation();
    };
    const keyup = (event: KeyboardEvent) => {
      const released = event.key.toLowerCase() === strings.presenter.l ? strings.presenter.laser : event.key.toLowerCase() === strings.common.p ? strings.presenter.pen : null;
      if (released) { setHeldTool(value => value === released ? null : value); drawing.current = false; }
    };
    const blur = () => { setHeldTool(null); drawing.current = false; };
    window.addEventListener(strings.common.keydown, keydown); window.addEventListener(strings.common.keyup, keyup); window.addEventListener(strings.common.blur, blur);
    return () => { window.removeEventListener(strings.common.keydown, keydown); window.removeEventListener(strings.common.keyup, keyup); window.removeEventListener(strings.common.blur, blur); };
  }, [next, previous, jump, slides, overview, blackout, fullscreen, navigate, presentation.id, presentation.slides]);
  const position = (event: PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * presentation.slideSize.width / rect.width, y: (event.clientY - rect.top) * presentation.slideSize.height / rect.height };
  };
  const openPresenter = async () => {
    const popup = window.open(strings.common.empty, `${strings.presenter.presenter_f990a125}${presentation.id}`, strings.presenter.popupWidth1280Height800);
    if (!popup) { toast.error(strings.presenter.allowPopUpsToOpenPresenterView); return; }
    try { await saveProject(); popup.location.href = `${strings.presenter.presenter}${presentation.id}`; }
    catch (error) { popup.close(); toast.error(String(error)); }
  };
  if (!slide) return <div className={strings.presenter.playerEmpty}>{strings.presenter.allSlidesAreSkipped}<button onClick={() => { void navigate(`${strings.common.edit}${presentation.id}`); }}>{strings.presenter.backToEditor}</button></div>;
  return <div className={strings.presenter.playerRoot} ref={stage}>
    <div className={strings.presenter.playerFit} style={{ width: presentation.slideSize.width * scale, height: presentation.slideSize.height * scale }}>
      <div className={strings.presenter.playerLogical} role={strings.presenter.region} aria-label={strings.presenter.audienceSlide} style={{width:presentation.slideSize.width,height:presentation.slideSize.height,transform:`${strings.common.scale}${scale}${strings.common.symbol_ba5ec51d}`}} onPointerUp={event=>{if(tool===strings.presenter.pointer&&!(event.target instanceof Element&&event.target.closest(strings.presenter.aButton)))next()}}>
        <div ref={content} key={slide.id}><SlideRenderer slide={slide} theme={presentation.theme} logicalSize={presentation.slideSize} width={presentation.slideSize.width} />
          {slide.elements.filter(element => !element.hidden && element.link).map(element => <button key={element.id} data-link-element={element.id} className={strings.presenter.playerLink} aria-label={`${strings.presenter.open}${element.name}${strings.presenter.link}`}
            style={{ left: element.x, top: element.y, width: element.width, height: element.height, transform: `${strings.common.rotate}${element.rotation}${strings.common.deg}` }}
            onClick={event => { event.stopPropagation(); const link = element.link; if (link?.kind === strings.common.slide) { const target = slides.findIndex(item => item.id === link.slideId); if (target >= 0) jump(target); }
              else if (link?.kind === strings.common.url && /^(https?:|mailto:|tel:)/i.test(link.href)) window.open(link.href, strings.common.blank, strings.presenter.noopenerNoreferrer); }} />)}
        </div>
        <svg className={`${strings.presenter.playerInk}${tool === strings.presenter.pointer ? strings.presenter.isPassive : strings.common.empty}`} viewBox={`${strings.common.value00}${presentation.slideSize.width}${strings.common.space}${presentation.slideSize.height}`}
          onPointerDown={event => { if (tool !== strings.presenter.pen) return; event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; setStrokes(value => [...value, { slideId: slide.id, points: [position(event)] }]); }}
          onPointerMove={event => { const point = position(event); setPointer(point); if (drawing.current) setStrokes(value => value.map((stroke, strokeIndex) => strokeIndex === value.length - 1 ? { ...stroke, points: [...stroke.points, point] } : stroke)); }}
          onPointerUp={event => { drawing.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onPointerCancel={() => { drawing.current = false; }} onPointerLeave={() => setPointer(null)}>
          {strokes.filter(stroke => stroke.slideId === slide.id).map((stroke, strokeIndex) => <polyline key={strokeIndex} points={stroke.points.map(point => `${point.x}${strings.common.symbol_d03502c4}${point.y}`).join(strings.common.space)} fill={strings.common.none} stroke={strings.common.colored7355} strokeWidth={strings.presenter.value7} strokeLinecap={strings.common.round} strokeLinejoin={strings.common.round} />)}
          {tool === strings.presenter.laser && pointer && <circle cx={pointer.x} cy={pointer.y} r={strings.presenter.value12} fill={strings.presenter.colorff3434} className={strings.presenter.playerLaser} />}
        </svg>
      </div>
    </div>
    {blackout && <button aria-label={strings.presenter.returnToPresentation} className={strings.presenter.playerBlackout} style={{ background: blackout }} onClick={() => setBlackout(null)} />}
    {overview && <div className={strings.presenter.playerOverview}><header><h2>{strings.presenter.jumpToASlide}</h2><button onClick={() => setOverview(false)} aria-label={strings.presenter.closeOverview}><X /></button></header><div>
      {slides.map((item, slideIndex) => <button key={item.id} onClick={() => jump(slideIndex)} className={slideIndex === index ? strings.presenter.isActive : strings.common.empty}>
        <SlideRenderer slide={item} theme={presentation.theme} logicalSize={presentation.slideSize} width={320} /><span>{presentation.slides.indexOf(item)+1}</span></button>)}
    </div></div>}
    <nav className={strings.presenter.playerControls} aria-label={strings.presenter.presentationControls}>
      <button onClick={() => { void navigate(`${strings.common.edit}${presentation.id}`); }} title={strings.presenter.exitPresentationEsc}><X size={18} /></button>
      <button onClick={previous} title={strings.presenter.previousSlide}><ArrowLeft size={18} /></button><span>{index + 1}{strings.common.symbol}{slides.length}</span><button onClick={next} title={strings.presenter.nextSlide}><ArrowRight size={18} /></button>
      <i /><button onClick={() => setOverview(value => !value)} title={strings.presenter.slideOverviewG}><Grid2X2 size={18} /></button>
      <button onClick={() => setTool(value => value === strings.presenter.laser ? strings.presenter.pointer : strings.presenter.laser)} className={tool === strings.presenter.laser ? strings.presenter.isActive : strings.common.empty} title={strings.presenter.laserPointerHoldL}><MousePointer2 size={18} /></button>
      <button onClick={() => setTool(value => value === strings.presenter.pen ? strings.presenter.pointer : strings.presenter.pen)} className={tool === strings.presenter.pen ? strings.presenter.isActive : strings.common.empty} title={strings.presenter.penHoldPClearInkE}><PenLine size={18} /></button>
      <label title={strings.presenter.automaticallyAdvanceSlidesAndBuilds} style={{ display: strings.presenter.flex, alignItems: strings.common.center, gap: 6 }}>{strings.presenter.auto}<select aria-label={strings.presenter.autoAdvanceInterval} value={autoAdvance} onChange={event => setAutoAdvance(Number(event.target.value))} style={{ color: strings.presenter.inherit, background: strings.presenter.color252525, borderRadius: 4, padding: 4 }}>
          <option value={strings.common.value0}>{strings.presenter.off}</option><option value={strings.common.value5}>{strings.presenter.value5s}</option><option value={strings.common.value10}>{strings.presenter.value10s}</option><option value={strings.presenter.value15}>{strings.presenter.value15s}</option><option value={strings.presenter.value30}>{strings.presenter.value30s}</option><option value={strings.presenter.value60}>{strings.presenter.value60s}</option>
        </select>
      </label>
      {jumpDigits && <span role={strings.presenter.status}>{strings.presenter.goTo}{jumpDigits}{strings.presenter.enter}</span>}
      <button onClick={() => void openPresenter()} title={strings.presenter.openPresenterView}><Monitor size={18} /></button><button onClick={fullscreen} title={strings.presenter.fullscreenF}><Expand size={18} /></button>
    </nav>
  </div>;
}
export default Player;
