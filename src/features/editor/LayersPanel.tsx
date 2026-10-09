import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, LockKeyhole, UnlockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/common/PropertyInputs';
import { useEditor } from '@/store/editor';
import type { Slide, SlideElement } from '@/types/model';

function layerIcon(element: SlideElement): string {
  switch (element.type) {
    case 'text': return 'T';
    case 'shape': return '◇';
    case 'image': return '▧';
    case 'line': return '╱';
    case 'table': return '▦';
    case 'chart': return '▥';
    default: { const exhaustive: never = element; throw new Error(`Unsupported layer: ${String(exhaustive)}`); }
  }
}

function SortableLayer({ element }: { element: SlideElement }) {
  const selected = useEditor(state => state.selection.includes(element.id));
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: element.id });
  return <div ref={setNodeRef} data-layer-id={element.id} className={`layer-row ${selected ? 'selected' : ''} ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <button type="button" className="layer-type" aria-label={`Select ${element.name}`} onClick={event => {
      const editor = useEditor.getState();
      editor.select(event.ctrlKey || event.metaKey ? selected ? editor.selection.filter(id => id !== element.id) : [...editor.selection, element.id] : [element.id]);
    }}>{layerIcon(element)}</button>
    <Input aria-label="Layer name" value={element.name} onFocus={() => useEditor.getState().select([element.id])} onChange={event => useEditor.getState().updateElement(element.id, { name: event.target.value })} />
    <Button variant="ghost" size="icon-xs" aria-label={element.hidden ? 'Show layer' : 'Hide layer'} onClick={() => useEditor.getState().updateElement(element.id, { hidden: !element.hidden })}>{element.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</Button>
    <Button variant="ghost" size="icon-xs" aria-label={element.locked ? 'Unlock layer' : 'Lock layer'} onClick={() => useEditor.getState().updateElement(element.id, { locked: !element.locked })}>{element.locked ? <LockKeyhole size={13} /> : <UnlockKeyhole size={13} />}</Button>
    <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} className="layer-drag-handle" aria-label={`Reorder layer ${element.name}`} title="Drag to reorder; Space to pick up, arrows to move, Space to drop"><GripVertical size={14} /></button>
  </div>;
}

export function LayersPanel({ slide }: { slide: Slide }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const elements = [...slide.elements].reverse();
  const reorder = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    useEditor.getState().mutate('Reorder layer', draft => {
      const target = draft.slides.find(item => item.id === slide.id);
      if (!target) return;
      const from = target.elements.findIndex(item => item.id === active.id);
      const to = target.elements.findIndex(item => item.id === over.id);
      if (from < 0 || to < 0) return;
      target.elements = arrayMove(target.elements, from, to);
    });
  };
  return <Section title={`${elements.length} layers`}>
    <p className="property-note">Topmost objects appear first. Drag a handle to reorder.</p>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
      <SortableContext items={elements.map(element => element.id)} strategy={verticalListSortingStrategy}>
        <div className="layer-list">{elements.map(element => <SortableLayer key={element.id} element={element} />)}</div>
      </SortableContext>
    </DndContext>
    {!elements.length && <p className="property-note">This slide is empty. Add an element from the toolbar.</p>}
  </Section>;
}
