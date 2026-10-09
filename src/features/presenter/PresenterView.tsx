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
import { strings } from "@/strings";


export function PresenterView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const presentation = useEditor(state => state.document);
  const loadProject = useEditor(state => state.loadProject);
  const [slideId, setSlideId] = useState<string>(strings.common.empty);
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
      if (!parsed.success || parsed.data.type !== strings.presenter.state) return;
      setConnected(true); setSlideId(parsed.data.slideId); setStep(parsed.data.step);
      setStartedAt(parsed.data.startedAt); setBlackout(parsed.data.blackout);
    };
    connection.postMessage({ type: strings.presenter.hello });
    const reconnect = window.setInterval(() => connection.postMessage({ type: strings.presenter.hello }), 3000);
    return () => { window.clearInterval(reconnect); connection.close(); channel.current = null; };
  }, [id, presentation.id]);
  const send = (command: Extract<PlayerMessage, { type: 'command' }>['command'], target?: string) => {
    channel.current?.postMessage({ type: strings.common.command, command, ...(target ? { slideId: target } : {}) });
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ([strings.common.iNPUT, strings.common.tEXTAREA] as readonly string[]).includes(event.target.tagName)) return;
      if (([strings.common.arrowRight_8e2f7ffb, strings.common.space, strings.presenter.pageDown] as readonly string[]).includes(event.key)) channel.current?.postMessage({ type: strings.common.command, command: strings.presenter.next });
      else if (([strings.common.arrowLeft_48e61e2d, strings.presenter.pageUp] as readonly string[]).includes(event.key)) channel.current?.postMessage({ type: strings.common.command, command: strings.presenter.previous });
      else return;
      event.preventDefault();
    };
    window.addEventListener(strings.common.keydown, keydown); return () => window.removeEventListener(strings.common.keydown, keydown);
  }, []);
  const elapsed = Math.max(0, Math.floor(((pausedAt ?? now) - startedAt - pausedDuration) / 1000));
  const timerText = `${String(Math.floor(elapsed / 3600)).padStart(2, strings.common.value0)}${strings.presenter.symbol}${String(Math.floor(elapsed % 3600 / 60)).padStart(2, strings.common.value0)}${strings.presenter.symbol}${String(elapsed % 60).padStart(2, strings.common.value0)}`;
  return <div className={strings.presenter.presenterRoot}>
    <header className={strings.presenter.presenterHeader}><div><span className={strings.presenter.presenterBrand}>{strings.common.folio}<span>{strings.presenter.symbol_4f8865ab}</span></span><span className={strings.presenter.presenterLabel}>{strings.presenter.presenterView}</span></div>
      <div><span className={`${strings.presenter.presenterConnection}${connected ? strings.presenter.isConnected : strings.common.empty}`}>{connected ? strings.presenter.audienceConnected : strings.presenter.waitingForAudience}</span>
        <Button variant={strings.common.outline} size={strings.common.sm} onClick={() => window.open(`${strings.common.present}${presentation.id}`, `${strings.presenter.audience}${presentation.id}`)}><ExternalLink size={14} />{strings.presenter.openAudience}</Button>
        <Button variant={strings.common.ghost} size={strings.common.icon} aria-label={strings.presenter.backToEditor} onClick={() => { void navigate(`${strings.common.edit}${presentation.id}`); }}><X size={18} /></Button></div>
    </header>
    <main className={strings.presenter.presenterMain}>
      <section className={strings.presenter.presenterCurrent}><div className={strings.presenter.presenterSectionLabel}>{strings.presenter.cURRENTSLIDE}<span>{index + 1}{strings.common.symbol}{slides.length}{step ? `${strings.presenter.build}${step}` : strings.common.empty}</span></div>
        <div className={strings.presenter.presenterSlide}>{slide ? <SlidePreview slide={slide} theme={presentation.theme} maxWidth={800} /> : <p>{strings.presenter.noPlayableSlides}</p>}{blackout && <div className={strings.presenter.presenterPreviewBlackout} style={{ background: blackout }}>{blackout === strings.presenter.black ? strings.presenter.audienceScreenIsBlack : strings.presenter.audienceScreenIsWhite}</div>}</div>
        <div className={strings.presenter.presenterNavigation}><Button variant={strings.common.outline} onClick={() => send(strings.presenter.previous)}><ArrowLeft size={16} />{strings.presenter.previous_a57b08a4}</Button><span>{strings.presenter.useToNavigate}</span><Button className={strings.common.bgEd7355TextWhiteHoverBgDc6446} onClick={() => send(strings.presenter.next)}>{strings.presenter.next_1ff57a29}<ArrowRight size={16} /></Button></div>
        <div className={strings.presenter.presenterNotes}><div className={strings.presenter.presenterSectionLabel}>{strings.presenter.sPEAKERNOTES}</div><NotesContent value={slide?.notes||strings.presenter.noNotesForThisSlideAddSpeakerNotesIn}/></div>
      </section>
      <aside className={strings.presenter.presenterSidebar}><section><div className={strings.presenter.presenterSectionLabel}>{strings.presenter.uPNEXT}</div><div className={strings.presenter.presenterNext}>{nextSlide ? <SlidePreview slide={nextSlide} theme={presentation.theme} maxWidth={360} /> : <div className={strings.presenter.presenterFinish}>{strings.presenter.youVeReachedTheFinalSlide}<br /><strong>{strings.presenter.makeItMemorable}</strong></div>}</div></section>
        <section className={strings.presenter.presenterTime}><div className={strings.presenter.presenterSectionLabel}>{strings.presenter.eLAPSEDTIME}<span>{new Date(now).toLocaleTimeString([], { hour: strings.presenter.value2Digit, minute: strings.presenter.value2Digit })}</span></div><strong>{timerText}</strong><div>
          <Button variant={strings.common.outline} size={strings.common.sm} onClick={() => { if (pausedAt) { setPausedDuration(value => value + Date.now() - pausedAt); setPausedAt(null); } else setPausedAt(Date.now()); }}><Pause size={14} />{pausedAt ? strings.presenter.resume_d640c742 : strings.presenter.pause}</Button>
          <Button variant={strings.common.ghost} size={strings.common.sm} onClick={() => { const start = Date.now(); setStartedAt(start); setPausedAt(null); setPausedDuration(0); send(strings.presenter.restart); }}><RotateCcw size={14} />{strings.presenter.reset}</Button></div></section>
        <section><div className={strings.presenter.presenterSectionLabel}>{strings.presenter.aUDIENCESCREEN}</div><div className={strings.presenter.presenterScreenControls}><Button variant={strings.common.outline} onClick={() => send(blackout === strings.presenter.black ? strings.presenter.resume : strings.presenter.black)}><span className={strings.presenter.presenterSwatchBlack} />{strings.presenter.black_c6cfe6e4}</Button><Button variant={strings.common.outline} onClick={() => send(blackout === strings.presenter.white ? strings.presenter.resume : strings.presenter.white)}><span className={strings.presenter.presenterSwatchWhite} />{strings.common.white}</Button></div></section>
        <section className={strings.presenter.presenterSlideList}><div className={strings.presenter.presenterSectionLabel}>{strings.presenter.jUMPTOSLIDE}</div>{slides.map((item, slideIndex) => <Button key={item.id} variant={item.id === slide?.id ? strings.common.secondary : strings.common.ghost} onClick={() => send(strings.presenter.next, item.id)}>{String(slideIndex + 1).padStart(2, strings.common.value0)}<span>{item.elements.find(element => element.type === strings.common.text)?.name ?? `${strings.common.slide_ff1e0604}${slideIndex + 1}`}</span></Button>)}</section>
      </aside>
    </main>
  </div>;
}
export default PresenterView;
