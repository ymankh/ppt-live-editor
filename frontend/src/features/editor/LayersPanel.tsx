import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, EyeOff, GripVertical, LockKeyhole, UnlockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/common/PropertyInputs';
import { useEditor } from '@/store/editor';
import type { Slide, SlideElement } from '@/types/model';
import { strings } from "@/strings";


function layerIcon(element: SlideElement): string {
  switch (element.type) {
    case strings.common.text: return strings.common.t;
    case strings.common.shape: return strings.editor.symbol_f88c1b77;
    case strings.common.image: return strings.editor.symbol_517a69f1;
    case strings.common.line: return strings.editor.symbol_bc9b960a;
    case strings.common.table: return strings.editor.symbol_7326f159;
    case strings.common.chart: return strings.editor.symbol_29f5e068;
    default: { const exhaustive: never = element; throw new Error(`${strings.editor.unsupportedLayer}${String(exhaustive)}`); }
  }
}

function SortableLayer({ element }: { element: SlideElement }) {
  const selected = useEditor(state => state.selection.includes(element.id));
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: element.id });
  return <div ref={setNodeRef} data-layer-id={element.id} className={`${strings.editor.layerRow}${selected ? strings.editor.selected : strings.common.empty}${strings.common.space}${isDragging ? strings.editor.isDragging : strings.common.empty}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <button type={strings.common.button} className={strings.editor.layerType} aria-label={`${strings.editor.select_1f7133c2}${element.name}`} onClick={event => {
      const editor = useEditor.getState();
      editor.select(event.ctrlKey || event.metaKey ? selected ? editor.selection.filter(id => id !== element.id) : [...editor.selection, element.id] : [element.id]);
    }}>{layerIcon(element)}</button>
    <Input aria-label={strings.editor.layerName} value={element.name} onFocus={() => useEditor.getState().select([element.id])} onChange={event => useEditor.getState().updateElement(element.id, { name: event.target.value })} />
    <Button variant={strings.common.ghost} size={strings.common.iconXs} aria-label={element.hidden ? strings.editor.showLayer : strings.editor.hideLayer} onClick={() => useEditor.getState().updateElement(element.id, { hidden: !element.hidden })}>{element.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</Button>
    <Button variant={strings.common.ghost} size={strings.common.iconXs} aria-label={element.locked ? strings.editor.unlockLayer : strings.editor.lockLayer} onClick={() => useEditor.getState().updateElement(element.id, { locked: !element.locked })}>{element.locked ? <LockKeyhole size={13} /> : <UnlockKeyhole size={13} />}</Button>
    <button type={strings.common.button} ref={setActivatorNodeRef} {...attributes} {...listeners} className={strings.editor.layerDragHandle} aria-label={`${strings.editor.reorderLayer_cfb5ebad}${element.name}`} title={strings.editor.dragToReorderSpaceToPickUpArrowsTo}><GripVertical size={14} /></button>
  </div>;
}

export function LayersPanel({ slide }: { slide: Slide }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const elements = [...slide.elements].reverse();
  const reorder = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    useEditor.getState().mutate(strings.editor.reorderLayer, draft => {
      const target = draft.slides.find(item => item.id === slide.id);
      if (!target) return;
      const from = target.elements.findIndex(item => item.id === active.id);
      const to = target.elements.findIndex(item => item.id === over.id);
      if (from < 0 || to < 0) return;
      target.elements = arrayMove(target.elements, from, to);
    });
  };
  return <Section title={`${elements.length}${strings.editor.layers}`}>
    <p className={strings.editor.propertyNote}>{strings.editor.topmostObjectsAppearFirstDragAHandleToReorder}</p>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
      <SortableContext items={elements.map(element => element.id)} strategy={verticalListSortingStrategy}>
        <div className={strings.editor.layerList}>{elements.map(element => <SortableLayer key={element.id} element={element} />)}</div>
      </SortableContext>
    </DndContext>
    {!elements.length && <p className={strings.editor.propertyNote}>{strings.editor.thisSlideIsEmptyAddAnElementFromThe}</p>}
  </Section>;
}
