import { NotesContent } from '@/features/text/NotesEditor';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, ArrowRight, ExternalLink, Pause, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SlidePreview } from './SlidePreview';
import { useEditor } from '@/store/editor';
import { channelName, playerMessageSchema } from './channel';
import type { PlayerMessage } from './channel';
import './player.css';

export function PresenterView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const presentation = useEditor(state => state.document);
  const loadProject = useEditor(state => state.loadProject);
  const [slideId, setSlideId] = useState('');
  const [step, setStep] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now);
  const [now, setNow] = useState(Date.now);
  const [blackout, setBlackout] = useState<'black' | 'white' | null>(null);
  const [connected, setConnected] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedDuration, setPausedDuration] = useState(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const slides = presentation.slides.filter(slide => !slide.skipped);
  const index = Math.max(0, slides.findIndex(slide => slide.id === slideId));
  const slide = slides[index];
  const nextSlide = slides[index + 1];
  useEffect(() => { if (id) void loadProject(id).catch((error: unknown) => toast.error(String(error))); }, [id, loadProject]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const connection = new BroadcastChannel(channelName(id ?? presentation.id)); channel.current = connection;
    connection.onmessage = event => {
      const parsed = playerMessageSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.type !== 'state') return;
      setConnected(true); setSlideId(parsed.data.slideId); setStep(parsed.data.step);
      setStartedAt(parsed.data.startedAt); setBlackout(parsed.data.blackout);
    };
    connection.postMessage({ type: 'hello' });
    const reconnect = window.setInterval(() => connection.postMessage({ type: 'hello' }), 3000);
    return () => { window.clearInterval(reconnect); connection.close(); channel.current = null; };
  }, [id, presentation.id]);
  const send = (command: Extract<PlayerMessage, { type: 'command' }>['command'], target?: string) => {
    channel.current?.postMessage({ type: 'command', command, ...(target ? { slideId: target } : {}) });
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
      if (['ArrowRight', ' ', 'PageDown'].includes(event.key)) channel.current?.postMessage({ type: 'command', command: 'next' });
      else if (['ArrowLeft', 'PageUp'].includes(event.key)) channel.current?.postMessage({ type: 'command', command: 'previous' });
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, []);
  const elapsed = Math.max(0, Math.floor(((pausedAt ?? now) - startedAt - pausedDuration) / 1000));
  const timerText = `${String(Math.floor(elapsed / 3600)).padStart(2, '0')}:${String(Math.floor(elapsed % 3600 / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  return <div className="presenter-root">
    <header className="presenter-header"><div><span className="presenter-brand">folio<span>•</span></span><span className="presenter-label">Presenter view</span></div>
      <div><span className={`presenter-connection ${connected ? 'is-connected' : ''}`}>{connected ? 'Audience connected' : 'Waiting for audience'}</span>
        <Button variant="outline" size="sm" onClick={() => window.open(`/present/${presentation.id}`, `audience-${presentation.id}`)}><ExternalLink size={14} />Open audience</Button>
        <Button variant="ghost" size="icon" aria-label="Back to editor" onClick={() => { void navigate(`/edit/${presentation.id}`); }}><X size={18} /></Button></div>
    </header>
    <main className="presenter-main">
      <section className="presenter-current"><div className="presenter-section-label">CURRENT SLIDE <span>{index + 1} / {slides.length}{step ? ` · Build ${step}` : ''}</span></div>
        <div className="presenter-slide">{slide ? <SlidePreview slide={slide} theme={presentation.theme} maxWidth={800} /> : <p>No playable slides</p>}{blackout && <div className="presenter-preview-blackout" style={{ background: blackout }}>{blackout === 'black' ? 'Audience screen is black' : 'Audience screen is white'}</div>}</div>
        <div className="presenter-navigation"><Button variant="outline" onClick={() => send('previous')}><ArrowLeft size={16} />Previous</Button><span>Use ← → to navigate</span><Button className="bg-[#ed7355] text-white hover:bg-[#dc6446]" onClick={() => send('next')}>Next<ArrowRight size={16} /></Button></div>
        <div className="presenter-notes"><div className="presenter-section-label">SPEAKER NOTES</div><NotesContent value={slide?.notes||'No notes for this slide. Add speaker notes in the editor to keep your talking points close.'}/></div>
      </section>
      <aside className="presenter-sidebar"><section><div className="presenter-section-label">UP NEXT</div><div className="presenter-next">{nextSlide ? <SlidePreview slide={nextSlide} theme={presentation.theme} maxWidth={360} /> : <div className="presenter-finish">You’ve reached the final slide.<br /><strong>Make it memorable.</strong></div>}</div></section>
        <section className="presenter-time"><div className="presenter-section-label">ELAPSED TIME<span>{new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div><strong>{timerText}</strong><div>
          <Button variant="outline" size="sm" onClick={() => { if (pausedAt) { setPausedDuration(value => value + Date.now() - pausedAt); setPausedAt(null); } else setPausedAt(Date.now()); }}><Pause size={14} />{pausedAt ? 'Resume' : 'Pause'}</Button>
          <Button variant="ghost" size="sm" onClick={() => { const start = Date.now(); setStartedAt(start); setPausedAt(null); setPausedDuration(0); send('restart'); }}><RotateCcw size={14} />Reset</Button></div></section>
        <section><div className="presenter-section-label">AUDIENCE SCREEN</div><div className="presenter-screen-controls"><Button variant="outline" onClick={() => send(blackout === 'black' ? 'resume' : 'black')}><span className="presenter-swatch black" />Black</Button><Button variant="outline" onClick={() => send(blackout === 'white' ? 'resume' : 'white')}><span className="presenter-swatch white" />White</Button></div></section>
        <section className="presenter-slide-list"><div className="presenter-section-label">JUMP TO SLIDE</div>{slides.map((item, slideIndex) => <Button key={item.id} variant={item.id === slide?.id ? 'secondary' : 'ghost'} onClick={() => send('next', item.id)}>{String(slideIndex + 1).padStart(2, '0')}<span>{item.elements.find(element => element.type === 'text')?.name ?? `Slide ${slideIndex + 1}`}</span></Button>)}</section>
      </aside>
    </main>
  </div>;
}
export default PresenterView;
