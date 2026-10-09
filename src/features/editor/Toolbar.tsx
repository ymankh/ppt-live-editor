import { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, ImagePlus, Italic, Layers, Minus, MousePointer2, Shapes, Table2, ChartNoAxesColumn, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NumberField } from '@/components/common/PropertyInputs';
import { useEditor } from '@/store/editor';
import { createElement } from '@/lib/defaults';
import type { ShapeKind, TextElement } from '@/types/model';
import './panels.css';

const shapes: { name: string; kind: ShapeKind; symbol: string }[] = [
  { name: 'Rectangle', kind: 'rect', symbol: '▭' }, { name: 'Rounded rectangle', kind: 'roundRect', symbol: '▢' },
  { name: 'Circle', kind: 'ellipse', symbol: '○' }, { name: 'Triangle', kind: 'triangle', symbol: '△' },
  { name: 'Right triangle', kind: 'rightTriangle', symbol: '◿' }, { name: 'Diamond', kind: 'diamond', symbol: '◇' },
  { name: 'Pentagon', kind: 'pentagon', symbol: '⬠' }, { name: 'Hexagon', kind: 'hexagon', symbol: '⬡' },
  { name: 'Octagon', kind: 'octagon', symbol: '⯄' }, { name: 'Star', kind: 'star5', symbol: '☆' },
  { name: 'Six-point star', kind: 'star6', symbol: '✡' }, { name: 'Right arrow', kind: 'arrowRight', symbol: '→' },
  { name: 'Left arrow', kind: 'arrowLeft', symbol: '←' }, { name: 'Up arrow', kind: 'arrowUp', symbol: '↑' },
  { name: 'Down arrow', kind: 'arrowDown', symbol: '↓' }, { name: 'Double arrow', kind: 'arrowDouble', symbol: '↔' },
  { name: 'Chevron', kind: 'chevron', symbol: '❯' }, { name: 'Parallelogram', kind: 'parallelogram', symbol: '▱' },
  { name: 'Trapezoid', kind: 'trapezoid', symbol: '⏢' }, { name: 'Plus', kind: 'plus', symbol: '+' },
  { name: 'Heart', kind: 'heart', symbol: '♡' }, { name: 'Cloud', kind: 'cloud', symbol: '☁' },
  { name: 'Callout', kind: 'calloutRect', symbol: '▤' }, { name: 'Oval callout', kind: 'calloutEllipse', symbol: '◯' },
];
const fonts = ['Geist', 'Inter', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];
const arrangements = [
  ['front', 'Bring to front'], ['forward', 'Bring forward'], ['backward', 'Send backward'], ['back', 'Send to back'],
  ['left', 'Align left'], ['center', 'Align center'], ['right', 'Align right'],
  ['top', 'Align top'], ['middle', 'Align middle'], ['bottom', 'Align bottom'],
] as const;

export function Toolbar() {
  const editor = useEditor();
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState('');
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(4);
  const [tableColumns, setTableColumns] = useState(3);
  const selected = editor.document.slides.find(s => s.id === editor.activeSlideId)?.elements.filter(e => editor.selection.includes(e.id)) ?? [];
  const text = selected.find((e): e is TextElement => e.type === 'text' && !e.locked);
  const setText = (patch: Partial<TextElement>) => editor.mutate('Format text', draft => {
    const slide = draft.slides.find(s => s.id === editor.activeSlideId);
    slide?.elements.forEach(e => { if (editor.selection.includes(e.id) && e.type === 'text' && !e.locked) Object.assign(e, patch); });
  });
  const insertTable = () => {
    const element = createElement('table');
    if (element.type !== 'table') return;
    element.columnWidths = Array.from({ length: tableColumns }, () => element.width / tableColumns);
    element.rows = Array.from({ length: tableRows }, () => ({
      id: nanoid(), height: element.height / tableRows,
      cells: Array.from({ length: tableColumns }, () => ({ id: nanoid(), content: { type: 'doc', content: [{ type: 'paragraph' }] }, fill: { type: 'none' as const }, colSpan: 1, rowSpan: 1 })),
    }));
    editor.mutate('Insert table', draft => { draft.slides.find(slide => slide.id === editor.activeSlideId)?.elements.push(element); });
    editor.select([element.id]);
    editor.setTool('select');
    setTableOpen(false);
  };
  const uploadImage = (file: File) => {
    setImageError('');
    if (!file.type.startsWith('image/')) { setImageError('Choose an image file.'); return; }
    const reader = new FileReader();
    reader.onerror = () => setImageError('This image could not be read.');
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const src = reader.result;
      const image = new Image();
      image.onerror = () => setImageError('This image format is not supported.');
      image.onload = () => {
        const element = createElement('image');
        if (element.type !== 'image') return;
        element.assetId = src;
        element.naturalWidth = image.naturalWidth;
        element.naturalHeight = image.naturalHeight;
        const size = useEditor.getState().document.slideSize;
        const ratio = Math.min(size.width * .6 / image.naturalWidth, size.height * .6 / image.naturalHeight, 1);
        element.width = image.naturalWidth * ratio;
        element.height = image.naturalHeight * ratio;
        element.x = (size.width - element.width) / 2;
        element.y = (size.height - element.height) / 2;
        element.name = file.name;
        const state = useEditor.getState();
        state.mutate('Insert image', draft => { draft.slides.find(s => s.id === state.activeSlideId)?.elements.push(element); });
        state.select([element.id]);
        state.setTool('select');
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  };
  return <div className="editor-toolbar" role="toolbar" aria-label="Slide editing tools">
    <Button variant="ghost" size="icon" title="Select (V)" aria-label="Select" aria-pressed={editor.tool === 'select'} className={editor.tool === 'select' ? 'tool-active' : ''} onClick={() => editor.setTool('select')}><MousePointer2 /></Button>
    <Button variant="ghost" size="icon" title="Insert text (T)" aria-label="Insert text" aria-pressed={editor.tool === 'text'} onClick={() => editor.setTool('text')}><Type /></Button>
    <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" className="tool-shapes" />} aria-label="Insert shape" title="Shapes"><Shapes /><ChevronDown size={12} /></DropdownMenuTrigger>
      <DropdownMenuContent className="shape-menu">{shapes.map(shape => <DropdownMenuItem key={shape.kind} onClick={() => { if (shape.kind === 'rect' || shape.kind === 'ellipse') editor.setTool(shape.kind); else editor.insert('shape', shape.kind); }}><span className="shape-symbol">{shape.symbol}</span>{shape.name}</DropdownMenuItem>)}<DropdownMenuItem onClick={() => editor.setTool('arrow')}><span className="shape-symbol">↗</span>Arrow line</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
    <Button variant="ghost" size="icon" aria-label="Insert line" title="Line" aria-pressed={editor.tool === 'line'} onClick={() => editor.setTool('line')}><Minus /></Button>
    <Button variant="ghost" size="icon" aria-label="Upload image" title="Image" onClick={() => fileInput.current?.click()}><ImagePlus /></Button>
    <input hidden ref={fileInput} type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) uploadImage(file); event.target.value = ''; }} />
    <Button variant="ghost" size="icon" aria-label="Insert table" title="Table" onClick={() => setTableOpen(true)}><Table2 /></Button>
    <Button variant="ghost" size="icon" aria-label="Insert chart" title="Chart" onClick={() => editor.insert('chart')}><ChartNoAxesColumn /></Button>
    <span className="toolbar-divider" />
    <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" className="font-picker" />} disabled={!text} aria-label="Font family">{text?.fontFamily ?? 'Geist'}<ChevronDown size={12} /></DropdownMenuTrigger>
      <DropdownMenuContent>{fonts.map(font => <DropdownMenuItem key={font} onClick={() => setText({ fontFamily: font })} style={{ fontFamily: font }}>{font}</DropdownMenuItem>)}</DropdownMenuContent>
    </DropdownMenu>
    <Input key={`${text?.id ?? 'none'}-${text?.fontSize ?? 48}`} className="toolbar-font-size" aria-label="Font size" type="number" min={1} max={1000} defaultValue={text?.fontSize ?? 48} disabled={!text} onBlur={event => { const value = Number(event.target.value); if (event.target.value.trim() && Number.isFinite(value) && value >= 1 && value <= 1000) { if (value !== text?.fontSize) setText({ fontSize: value }); } else event.target.value = String(text?.fontSize ?? 48); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { event.currentTarget.value = String(text?.fontSize ?? 48); event.currentTarget.blur(); } }} />
    <span className="toolbar-divider" />
    <Button variant="ghost" size="icon" aria-label="Bold" title="Bold" disabled={!text} aria-pressed={text?.bold ?? false} className={text?.bold ? 'tool-active' : ''} onClick={() => setText({ bold: !text?.bold })}><Bold /></Button>
    <Button variant="ghost" size="icon" aria-label="Italic" title="Italic" disabled={!text} aria-pressed={text?.italic ?? false} className={text?.italic ? 'tool-active' : ''} onClick={() => setText({ italic: !text?.italic })}><Italic /></Button>
    {([{ value: 'left', Icon: AlignLeft }, { value: 'center', Icon: AlignCenter }, { value: 'right', Icon: AlignRight }] as const).map(({ value, Icon }) => <Button key={value} variant="ghost" size="icon" aria-label={`Align text ${value}`} title={`Align ${value}`} disabled={!text} aria-pressed={text?.align === value} onClick={() => setText({ align: value })}><Icon /></Button>)}
    <label className={`toolbar-color ${!text ? 'is-disabled' : ''}`} title="Text color"><span style={{ borderBottomColor: text?.color ?? '#333333' }}>A</span><input aria-label="Text color" type="color" value={text?.color ?? '#333333'} disabled={!text} onChange={event => setText({ color: event.target.value })} /></label>
    <span className="toolbar-divider" />
    <Popover><PopoverTrigger render={<Button variant="ghost" />} disabled={!selected.length}><Layers />Arrange<ChevronDown size={12} /></PopoverTrigger>
      <PopoverContent className="arrange-popover" align="end"><span className="panel-kicker">POSITION & ORDER</span>{arrangements.map(([value, label]) => <Button variant="ghost" key={value} onClick={() => editor.arrange(value)}>{label}</Button>)}<Button variant="ghost" disabled={selected.filter(element => !element.locked).length < 3} onClick={() => editor.distribute('horizontal')}>Distribute horizontally</Button><Button variant="ghost" disabled={selected.filter(element => !element.locked).length < 3} onClick={() => editor.distribute('vertical')}>Distribute vertically</Button><Button variant="ghost" disabled={selected.filter(element => !element.locked).length < 2} onClick={() => editor.matchSize('width')}>Match width</Button><Button variant="ghost" disabled={selected.filter(element => !element.locked).length < 2} onClick={() => editor.matchSize('height')}>Match height</Button><Button variant="ghost" disabled={selected.filter(element => !element.locked).length < 2} onClick={() => editor.matchSize('both')}>Match size</Button><Button variant="ghost" onClick={() => editor.flip('horizontal')}>Flip horizontally</Button><Button variant="ghost" onClick={() => editor.flip('vertical')}>Flip vertically</Button></PopoverContent>
    </Popover>
    {imageError && <span className="toolbar-error" role="alert">{imageError}</span>}
    <Dialog open={tableOpen} onOpenChange={setTableOpen}><DialogContent className="table-insert-dialog"><DialogHeader><DialogTitle>Insert table</DialogTitle><DialogDescription>Choose the number of rows and columns. Edit and merge cells from the Design panel.</DialogDescription></DialogHeader><div className="property-grid"><NumberField label="Rows" min={1} max={50} step={1} value={tableRows} onChange={value => setTableRows(Math.round(value))} /><NumberField label="Columns" min={1} max={20} step={1} value={tableColumns} onChange={value => setTableColumns(Math.round(value))} /></div><div className="dialog-actions"><Button variant="outline" onClick={() => setTableOpen(false)}>Cancel</Button><Button onClick={insertTable}>Insert table</Button></div></DialogContent></Dialog>
  </div>;
}
