import { memo, useEffect, useRef, useState, type MouseEvent } from 'react';
import { nanoid } from 'nanoid';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type Modifier } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, GripVertical, LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SlideRenderer } from '@/features/renderer/SlideRenderer';
import { createSlide, layouts } from '@/lib/defaults';
import { useEditor } from '@/store/editor';
import type { Slide, Theme } from '@/types/model';
import '../editor/panels.css';
import { strings } from "@/strings";


const layoutPreviews = layouts.map(layout => ({ ...layout, slide: createSlide(layout.id) }));
const slideDragModifiers: Modifier[] = [({ transform }) => ({ ...transform, x: 0 })];

const SlideThumbnail = memo(function SlideThumbnail({ slide, theme }: { slide: Slide; theme: Theme }) {
  const logicalSize=useEditor(state=>state.document.slideSize);
  const node = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [width,setWidth]=useState(0);
  const [preview, setPreview] = useState({ slide, theme });
  useEffect(() => {
    const target = node.current;
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      setVisible(entries.some(entry => entry.isIntersecting));
    }, { rootMargin: strings.slides.value250px0px });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  useEffect(()=>{
    const target=node.current;if(!target)return;
    const observer=new ResizeObserver(entries=>{
      const entry=entries[0];if(entry)setWidth(entry.contentRect.width);
    });
    observer.observe(target);return()=>observer.disconnect();
  },[]);
  useEffect(() => {
    const timer = window.setTimeout(() => setPreview({ slide, theme }), 120);
    return () => window.clearTimeout(timer);
  }, [slide, theme]);
  return <div ref={node} className={strings.slides.slideThumbnailScale} style={{aspectRatio:`${logicalSize.width}${strings.common.symbol}${logicalSize.height}`}}>{visible&&width>0&&<SlideRenderer slide={preview.slide} theme={preview.theme} logicalSize={logicalSize} width={width}/>}</div>;
});

function SortableSlide({ slide, theme, index, selected, onSelect, onDuplicate, onDelete, canDelete }: {
  slide: Slide; theme: Theme; index: number; selected: boolean; onSelect: (event: MouseEvent) => void;
  onDuplicate: () => void; onDelete: () => void; canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .45 : 1 }} className={`${strings.slides.slideItem}${selected ? strings.common.isSelected : strings.common.empty}`}>
    <span className={strings.slides.slideNumber}>{index + 1}</span>
    <ContextMenu><ContextMenuTrigger render={<div />} className={strings.slides.slideContext}>
      <button type={strings.common.button} className={strings.slides.slideThumbnail} onClick={onSelect} aria-label={`${strings.common.slide_ff1e0604}${index + 1}`} aria-pressed={selected}>
        <SlideThumbnail slide={slide} theme={theme} />
      </button>
    </ContextMenuTrigger>
      <ContextMenuContent><ContextMenuItem onClick={onDuplicate}><Copy size={14} />{strings.slides.duplicateSlide}{selected ? strings.common.s : strings.common.empty}</ContextMenuItem><ContextMenuItem variant={strings.common.destructive} disabled={!canDelete} onClick={onDelete}><Trash2 size={14} />{strings.slides.deleteSlide}{selected ? strings.common.s : strings.common.empty}</ContextMenuItem></ContextMenuContent>
    </ContextMenu>
    <button type={strings.common.button} className={strings.slides.slideDragHandle} aria-label={`${strings.slides.reorderSlide}${index + 1}`} {...attributes} {...listeners}><GripVertical size={13} /></button>
  </div>;
}

export function SlidePanel() {
  const editor = useEditor();
  const [slideSelection, setSlideSelection] = useState<{ ids: string[]; activeId: string }>({ ids: [], activeId: editor.activeSlideId });
  const setSelectedIds = (ids: string[], activeId = useEditor.getState().activeSlideId) => setSlideSelection({ ids, activeId });
  const [layoutOpen, setLayoutOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const slides = editor.document.slides;
  const currentIds = [...new Set([editor.activeSlideId, ...(slideSelection.activeId === editor.activeSlideId ? slideSelection.ids : [])])].filter(id => slides.some(slide => slide.id === id));
  const selectSlide = (event: MouseEvent, id: string) => {
    if (event.shiftKey) {
      const start = slides.findIndex(s => s.id === editor.activeSlideId);
      const end = slides.findIndex(s => s.id === id);
      setSelectedIds(slides.slice(Math.min(start, end), Math.max(start, end) + 1).map(s => s.id), id);
    } else if (event.ctrlKey || event.metaKey) {
      const next = currentIds.includes(id) ? currentIds.filter(item => item !== id) : [...currentIds, id];
      const activeId = next.includes(id) ? id : next.at(-1);
      setSelectedIds(next, activeId ?? editor.activeSlideId);
      if (activeId) editor.setActiveSlide(activeId);
      return;
    } else setSelectedIds([id], id);
    editor.setActiveSlide(id);
  };
  const duplicate = (id: string) => {
    const ids = currentIds.includes(id) ? currentIds : [id];
    const copies = slides.filter(slide => ids.includes(slide.id)).map(slide => {
      const copy = structuredClone(slide);
      copy.id = nanoid();
      const groups = new Map<string, string>();
      copy.elements.forEach(element => {
        element.id = nanoid();
        element.animations.forEach(animation => { animation.id = nanoid(); });
        if (element.groupId) {
          const group = groups.get(element.groupId) ?? nanoid();
          groups.set(element.groupId, group);
          element.groupId = group;
        }
        if (element.type === strings.common.table) element.rows.forEach(row => { row.id = nanoid(); row.cells.forEach(cell => { cell.id = nanoid(); }); });
        if (element.type === strings.common.chart) element.series.forEach(series => { series.id = nanoid(); });
      });
      return { source: slide.id, copy };
    });
    editor.mutate(strings.slides.duplicateSlides, draft => {
      copies.forEach(({ source, copy }) => { const index = draft.slides.findIndex(s => s.id === source); draft.slides.splice(index + 1, 0, copy); });
    });
    const firstCopy = copies[0];
    setSelectedIds(copies.map(item => item.copy.id), firstCopy?.copy.id ?? editor.activeSlideId);
    if (firstCopy) editor.setActiveSlide(firstCopy.copy.id);
  };
  const remove = (id: string) => {
    const ids = currentIds.includes(id) ? currentIds : [id];
    if (ids.length >= slides.length) return;
    const index = slides.findIndex(slide => slide.id === id);
    const remaining = slides.filter(slide => !ids.includes(slide.id));
    editor.mutate(strings.slides.deleteSlides, draft => { draft.slides = draft.slides.filter(slide => !ids.includes(slide.id)); });
    setSelectedIds([]);
    const nextSlide = remaining[Math.min(index, remaining.length - 1)];
    if (ids.includes(editor.activeSlideId) && nextSlide) editor.setActiveSlide(nextSlide.id);
  };
  const reorder = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const movingIds = currentIds.includes(String(active.id)) ? currentIds : [String(active.id)];
    if (movingIds.includes(String(over.id))) return;
    editor.mutate(strings.slides.reorderSlides, draft => {
      const moving = draft.slides.filter(slide => movingIds.includes(slide.id));
      const targetIndex = draft.slides.findIndex(slide => slide.id === over.id);
      const sourceIndex = draft.slides.findIndex(slide => slide.id === active.id);
      const remaining = draft.slides.filter(slide => !movingIds.includes(slide.id));
      const destination = remaining.findIndex(slide => slide.id === over.id) + (sourceIndex < targetIndex ? 1 : 0);
      remaining.splice(destination, 0, ...moving);
      draft.slides = remaining;
    });
  };
  return <aside className={strings.slides.slidePanel} aria-label={strings.common.slides}>
    <div className={strings.common.panelHeader}><h2>{strings.slides.slides}<span className={strings.slides.slideCount}>{slides.length}</span></h2><Button variant={strings.common.ghost} size={strings.common.iconSm} title={strings.slides.chooseASlideLayout} aria-label={strings.slides.chooseSlideLayout} onClick={() => setLayoutOpen(true)}><Plus size={17} /></Button></div>
    <div className={strings.slides.slideList}><DndContext sensors={sensors} modifiers={slideDragModifiers} collisionDetection={closestCenter} onDragEnd={reorder}><SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
      {slides.map((slide, index) => <SortableSlide key={slide.id} slide={slide} theme={editor.document.theme} index={index} selected={currentIds.includes(slide.id)} onSelect={event => selectSlide(event, slide.id)} onDuplicate={() => duplicate(slide.id)} onDelete={() => remove(slide.id)} canDelete={(currentIds.includes(slide.id) ? currentIds.length : 1) < slides.length} />)}
    </SortableContext></DndContext></div>
    <div className={strings.slides.slidePanelFooter}><Button variant={strings.common.outline} className={strings.slides.addSlideButton} onClick={() => { editor.addSlide(); setSelectedIds([]); }}><Plus size={16} />{strings.common.addSlide}</Button><Button variant={strings.common.ghost} size={strings.common.icon} aria-label={strings.slides.slideLayouts} title={strings.slides.slideLayouts} onClick={() => setLayoutOpen(true)}><LayoutTemplate size={17} /></Button></div>
    <Dialog open={layoutOpen} onOpenChange={setLayoutOpen}><DialogContent className={strings.slides.layoutDialog}><DialogHeader><DialogTitle>{strings.slides.aFreshCanvas}</DialogTitle><DialogDescription>{strings.slides.chooseALayoutToStartYourNextSlide}</DialogDescription></DialogHeader>
      <div className={strings.slides.layoutDialogGrid}>{layoutPreviews.map(layout => <button className={strings.slides.layoutOption} key={layout.id} onClick={() => { editor.addSlide(layout.id); setSelectedIds([]); setLayoutOpen(false); }}><div className={strings.slides.layoutPreview}><div><SlideRenderer slide={layout.slide} theme={editor.document.theme} width={1920} /></div></div><span>{layout.name}</span></button>)}</div>
    </DialogContent></Dialog>
  </aside>;
}
