import { memo, useEffect, useRef, useState, type MouseEvent } from 'react';
import { nanoid } from 'nanoid';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
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

const layoutPreviews = layouts.map(layout => ({ ...layout, slide: createSlide(layout.id) }));

const SlideThumbnail = memo(function SlideThumbnail({ slide, theme }: { slide: Slide; theme: Theme }) {
  const logicalSize=useEditor(state=>state.document.slideSize);
  const node = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [preview, setPreview] = useState({ slide, theme });
  useEffect(() => {
    const target = node.current;
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      setVisible(entries.some(entry => entry.isIntersecting));
    }, { rootMargin: '250px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setPreview({ slide, theme }), 120);
    return () => window.clearTimeout(timer);
  }, [slide, theme]);
  return <div ref={node} className="slide-thumbnail-scale">{visible&&<SlideRenderer slide={preview.slide} theme={preview.theme} logicalSize={logicalSize} width={1920}/>}</div>;
});

function SortableSlide({ slide, theme, index, selected, onSelect, onDuplicate, onDelete, canDelete }: {
  slide: Slide; theme: Theme; index: number; selected: boolean; onSelect: (event: MouseEvent) => void;
  onDuplicate: () => void; onDelete: () => void; canDelete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .45 : 1 }} className={`slide-item ${selected ? 'is-selected' : ''}`}>
    <span className="slide-number">{index + 1}</span>
    <ContextMenu><ContextMenuTrigger render={<div />} className="slide-context">
      <button type="button" className="slide-thumbnail" onClick={onSelect} aria-label={`Slide ${index + 1}`} aria-pressed={selected}>
        <SlideThumbnail slide={slide} theme={theme} />
      </button>
    </ContextMenuTrigger>
      <ContextMenuContent><ContextMenuItem onClick={onDuplicate}><Copy size={14} />Duplicate slide{selected ? 's' : ''}</ContextMenuItem><ContextMenuItem variant="destructive" disabled={!canDelete} onClick={onDelete}><Trash2 size={14} />Delete slide{selected ? 's' : ''}</ContextMenuItem></ContextMenuContent>
    </ContextMenu>
    <button type="button" className="slide-drag-handle" aria-label={`Reorder slide ${index + 1}`} {...attributes} {...listeners}><GripVertical size={13} /></button>
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
        if (element.type === 'table') element.rows.forEach(row => { row.id = nanoid(); row.cells.forEach(cell => { cell.id = nanoid(); }); });
        if (element.type === 'chart') element.series.forEach(series => { series.id = nanoid(); });
      });
      return { source: slide.id, copy };
    });
    editor.mutate('Duplicate slides', draft => {
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
    editor.mutate('Delete slides', draft => { draft.slides = draft.slides.filter(slide => !ids.includes(slide.id)); });
    setSelectedIds([]);
    const nextSlide = remaining[Math.min(index, remaining.length - 1)];
    if (ids.includes(editor.activeSlideId) && nextSlide) editor.setActiveSlide(nextSlide.id);
  };
  const reorder = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const movingIds = currentIds.includes(String(active.id)) ? currentIds : [String(active.id)];
    if (movingIds.includes(String(over.id))) return;
    editor.mutate('Reorder slides', draft => {
      const moving = draft.slides.filter(slide => movingIds.includes(slide.id));
      const targetIndex = draft.slides.findIndex(slide => slide.id === over.id);
      const sourceIndex = draft.slides.findIndex(slide => slide.id === active.id);
      const remaining = draft.slides.filter(slide => !movingIds.includes(slide.id));
      const destination = remaining.findIndex(slide => slide.id === over.id) + (sourceIndex < targetIndex ? 1 : 0);
      remaining.splice(destination, 0, ...moving);
      draft.slides = remaining;
    });
  };
  return <aside className="slide-panel" aria-label="Slides">
    <div className="panel-header"><h2>Slides <span className="slide-count">{slides.length}</span></h2><Button variant="ghost" size="icon-sm" title="Choose a slide layout" aria-label="Choose slide layout" onClick={() => setLayoutOpen(true)}><Plus size={17} /></Button></div>
    <div className="slide-list"><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}><SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
      {slides.map((slide, index) => <SortableSlide key={slide.id} slide={slide} theme={editor.document.theme} index={index} selected={currentIds.includes(slide.id)} onSelect={event => selectSlide(event, slide.id)} onDuplicate={() => duplicate(slide.id)} onDelete={() => remove(slide.id)} canDelete={(currentIds.includes(slide.id) ? currentIds.length : 1) < slides.length} />)}
    </SortableContext></DndContext></div>
    <div className="slide-panel-footer"><Button variant="outline" className="add-slide-button" onClick={() => { editor.addSlide(); setSelectedIds([]); }}><Plus size={16} />Add slide</Button><Button variant="ghost" size="icon" aria-label="Slide layouts" title="Slide layouts" onClick={() => setLayoutOpen(true)}><LayoutTemplate size={17} /></Button></div>
    <Dialog open={layoutOpen} onOpenChange={setLayoutOpen}><DialogContent className="layout-dialog"><DialogHeader><DialogTitle>A fresh canvas</DialogTitle><DialogDescription>Choose a layout to start your next slide.</DialogDescription></DialogHeader>
      <div className="layout-dialog-grid">{layoutPreviews.map(layout => <button className="layout-option" key={layout.id} onClick={() => { editor.addSlide(layout.id); setSelectedIds([]); setLayoutOpen(false); }}><div className="layout-preview"><div><SlideRenderer slide={layout.slide} theme={editor.document.theme} width={1920} /></div></div><span>{layout.name}</span></button>)}</div>
    </DialogContent></Dialog>
  </aside>;
}
