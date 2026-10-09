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

type Stroke = { slideId: string; points: Point[] };
export function Player() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const startSlide = Math.max(0, Number(search.get('slide')) || 0);
  const navigate = useNavigate();
  const presentation = useEditor(state => state.document);
  const loadProject = useEditor(state => state.loadProject);
  const saveProject = useEditor(state => state.saveProject);
  const slides = useMemo(() => presentation.slides.filter(slide => !slide.skipped), [presentation.slides]);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [blackout, setBlackout] = useState<'black' | 'white' | null>(null);
  const [overview, setOverview] = useState(false);
  const [selectedTool, setTool] = useState<'pointer' | 'laser' | 'pen'>('pointer');
  const [heldTool, setHeldTool] = useState<'laser' | 'pen' | null>(null);
  const tool = heldTool ?? selectedTool;
  const [autoAdvance, setAutoAdvance] = useState(0);
  const [jumpDigits, setJumpDigits] = useState('');
  const numericJump = useRef('');
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
    window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    if (!slide || !content.current) return;
    const animations: globalThis.Animation[] = [];
    for (const element of slide.elements) {
      const node = content.current.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(element.id)}"]`);
      if (!node) continue;
      node.style.visibility = element.animations.some(animation => animation.category === 'entrance') ? 'hidden' : '';
      const link = content.current.querySelector<HTMLElement>(`[data-link-element="${CSS.escape(element.id)}"]`);
      if (link) link.style.visibility = node.style.visibility;
    }
    for (let groupIndex = 0; groupIndex <= step; groupIndex++) for (const item of groups[groupIndex] ?? []) {
      const node = content.current.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(item.elementId)}"]`);
      if (!node) continue;
      node.style.visibility = '';
      const animation = animateStep(node, item.animation, groupIndex < step ? 0 : item.offset);
      const link = content.current.querySelector<HTMLElement>(`[data-link-element="${CSS.escape(item.elementId)}"]`);
      if (link) {
        link.style.visibility = '';
        animation.onfinish = () => { if (item.animation.category === 'exit') link.style.visibility = 'hidden'; };
      }
      if (groupIndex < step) animation.finish();
      animations.push(animation);
    }
    return () => animations.forEach(animation => animation.cancel());
  }, [slide, groups, step]);
  useEffect(() => {
    if (!slide || !content.current || slide.transition.effect === 'none') return;
    const animation = content.current.animate(transitionFrames[slide.transition.effect], { duration: slide.transition.duration * 1000, easing: 'ease-out' });
    return () => animation.cancel();
  }, [slide]);
  const jump = useCallback((nextIndex: number) => { setIndex(Math.max(0, Math.min(slides.length - 1, nextIndex))); setStep(0); setBlackout(null); setOverview(false); }, [slides.length]);
  const next = useCallback(() => { if (blackout) setBlackout(null); else if (step < groups.length - 1) setStep(step + 1); else jump(index + 1); }, [blackout, step, groups.length, jump, index]);
  const previous = useCallback(() => { if (blackout) setBlackout(null); else if (step > 0) setStep(step - 1); else jump(index - 1); }, [blackout, step, jump, index]);
  const fullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => toast.error('Could not exit fullscreen.'));
    else void stage.current?.requestFullscreen().catch(() => toast.error('Fullscreen is unavailable in this browser.'));
  }, []);
  useEffect(() => {
    if (!autoAdvance || blackout || overview || heldTool || tool === 'pen' || !slide) return;
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
      if (message.type === 'hello') connection.postMessage({ type: 'state', slideId: slide?.id ?? '', step, startedAt, blackout });
      if (message.type !== 'command') return;
      if (message.slideId) { const target = slides.findIndex(item => item.id === message.slideId); if (target >= 0) jump(target); return; }
      if (message.command === 'next') next();
      if (message.command === 'previous') previous();
      if (message.command === 'black') setBlackout('black');
      if (message.command === 'white') setBlackout('white');
      if (message.command === 'resume') setBlackout(null);
      if (message.command === 'restart') setStartedAt(Date.now());
    };
    connection.postMessage({ type: 'state', slideId: slide?.id ?? '', step, startedAt, blackout });
    return () => { connection.close(); channel.current = null; };
  }, [id, presentation.id, slide?.id, slides, step, startedAt, blackout, jump, next, previous]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (/^\d$/.test(key)) { numericJump.current = `${numericJump.current}${key}`.slice(-4); setJumpDigits(numericJump.current); }
      else if (key === 'enter' && numericJump.current) {
        const number = Number(numericJump.current);
        const target = slides.findIndex(item => item.id === presentation.slides[number - 1]?.id);
        if (target >= 0) jump(target);
        else toast.error('That slide is unavailable or skipped.');
        numericJump.current = ''; setJumpDigits('');
      }
      else if (['arrowright', 'arrowdown', ' ', 'enter', 'pagedown'].includes(key)) next();
      else if (['arrowleft', 'arrowup', 'pageup'].includes(key)) previous();
      else if (key === 'home') jump(0);
      else if (key === 'end') jump(slides.length - 1);
      else if (key === 'b' || key === '.') setBlackout(value => value === 'black' ? null : 'black');
      else if (key === 'w' || key === ',') setBlackout(value => value === 'white' ? null : 'white');
      else if (key === 'g') { if (!event.repeat) setOverview(value => !value); }
      else if (key === 'l') setHeldTool('laser');
      else if (key === 'p') setHeldTool('pen');
      else if (key === 'e') setStrokes([]);
      else if (key === 'f') fullscreen();
      else if (key === 'escape') { numericJump.current = ''; setJumpDigits(''); if (overview) setOverview(false); else if (blackout) setBlackout(null); else void navigate(`/edit/${presentation.id}`); }
      else return;
      event.preventDefault(); event.stopPropagation();
    };
    const keyup = (event: KeyboardEvent) => {
      const released = event.key.toLowerCase() === 'l' ? 'laser' : event.key.toLowerCase() === 'p' ? 'pen' : null;
      if (released) { setHeldTool(value => value === released ? null : value); drawing.current = false; }
    };
    const blur = () => { setHeldTool(null); drawing.current = false; };
    window.addEventListener('keydown', keydown); window.addEventListener('keyup', keyup); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur); };
  }, [next, previous, jump, slides, overview, blackout, fullscreen, navigate, presentation.id, presentation.slides]);
  const position = (event: PointerEvent<SVGSVGElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * presentation.slideSize.width / rect.width, y: (event.clientY - rect.top) * presentation.slideSize.height / rect.height };
  };
  const openPresenter = async () => {
    const popup = window.open('', `presenter-${presentation.id}`, 'popup,width=1280,height=800');
    if (!popup) { toast.error('Allow pop-ups to open presenter view.'); return; }
    try { await saveProject(); popup.location.href = `/presenter/${presentation.id}`; }
    catch (error) { popup.close(); toast.error(String(error)); }
  };
  if (!slide) return <div className="player-empty">All slides are skipped. <button onClick={() => { void navigate(`/edit/${presentation.id}`); }}>Back to editor</button></div>;
  return <div className="player-root" ref={stage}>
    <div className="player-fit" style={{ width: presentation.slideSize.width * scale, height: presentation.slideSize.height * scale }}>
      <div className="player-logical" role="region" aria-label="Audience slide" style={{width:presentation.slideSize.width,height:presentation.slideSize.height,transform:`scale(${scale})`}} onPointerUp={event=>{if(tool==='pointer'&&!(event.target instanceof Element&&event.target.closest('a,button')))next()}}>
        <div ref={content} key={slide.id}><SlideRenderer slide={slide} theme={presentation.theme} logicalSize={presentation.slideSize} width={presentation.slideSize.width} />
          {slide.elements.filter(element => !element.hidden && element.link).map(element => <button key={element.id} data-link-element={element.id} className="player-link" aria-label={`Open ${element.name} link`}
            style={{ left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation}deg)` }}
            onClick={event => { event.stopPropagation(); const link = element.link; if (link?.kind === 'slide') { const target = slides.findIndex(item => item.id === link.slideId); if (target >= 0) jump(target); }
              else if (link?.kind === 'url' && /^(https?:|mailto:|tel:)/i.test(link.href)) window.open(link.href, '_blank', 'noopener,noreferrer'); }} />)}
        </div>
        <svg className={`player-ink ${tool === 'pointer' ? 'is-passive' : ''}`} viewBox={`0 0 ${presentation.slideSize.width} ${presentation.slideSize.height}`}
          onPointerDown={event => { if (tool !== 'pen') return; event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; setStrokes(value => [...value, { slideId: slide.id, points: [position(event)] }]); }}
          onPointerMove={event => { const point = position(event); setPointer(point); if (drawing.current) setStrokes(value => value.map((stroke, strokeIndex) => strokeIndex === value.length - 1 ? { ...stroke, points: [...stroke.points, point] } : stroke)); }}
          onPointerUp={event => { drawing.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onPointerCancel={() => { drawing.current = false; }} onPointerLeave={() => setPointer(null)}>
          {strokes.filter(stroke => stroke.slideId === slide.id).map((stroke, strokeIndex) => <polyline key={strokeIndex} points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#ed7355" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />)}
          {tool === 'laser' && pointer && <circle cx={pointer.x} cy={pointer.y} r="12" fill="#ff3434" className="player-laser" />}
        </svg>
      </div>
    </div>
    {blackout && <button aria-label="Return to presentation" className="player-blackout" style={{ background: blackout }} onClick={() => setBlackout(null)} />}
    {overview && <div className="player-overview"><header><h2>Jump to a slide</h2><button onClick={() => setOverview(false)} aria-label="Close overview"><X /></button></header><div>
      {slides.map((item, slideIndex) => <button key={item.id} onClick={() => jump(slideIndex)} className={slideIndex === index ? 'is-active' : ''}>
        <SlideRenderer slide={item} theme={presentation.theme} logicalSize={presentation.slideSize} width={320} /><span>{presentation.slides.indexOf(item)+1}</span></button>)}
    </div></div>}
    <nav className="player-controls" aria-label="Presentation controls">
      <button onClick={() => { void navigate(`/edit/${presentation.id}`); }} title="Exit presentation (Esc)"><X size={18} /></button>
      <button onClick={previous} title="Previous slide"><ArrowLeft size={18} /></button><span>{index + 1} / {slides.length}</span><button onClick={next} title="Next slide"><ArrowRight size={18} /></button>
      <i /><button onClick={() => setOverview(value => !value)} title="Slide overview (G)"><Grid2X2 size={18} /></button>
      <button onClick={() => setTool(value => value === 'laser' ? 'pointer' : 'laser')} className={tool === 'laser' ? 'is-active' : ''} title="Laser pointer (hold L)"><MousePointer2 size={18} /></button>
      <button onClick={() => setTool(value => value === 'pen' ? 'pointer' : 'pen')} className={tool === 'pen' ? 'is-active' : ''} title="Pen (hold P), clear ink (E)"><PenLine size={18} /></button>
      <label title="Automatically advance slides and builds" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Auto
        <select aria-label="Auto advance interval" value={autoAdvance} onChange={event => setAutoAdvance(Number(event.target.value))} style={{ color: 'inherit', background: '#252525', borderRadius: 4, padding: 4 }}>
          <option value="0">Off</option><option value="5">5s</option><option value="10">10s</option><option value="15">15s</option><option value="30">30s</option><option value="60">60s</option>
        </select>
      </label>
      {jumpDigits && <span role="status">Go to {jumpDigits} · Enter</span>}
      <button onClick={() => void openPresenter()} title="Open presenter view"><Monitor size={18} /></button><button onClick={fullscreen} title="Fullscreen (F)"><Expand size={18} /></button>
    </nav>
  </div>;
}
export default Player;
