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
import { strings } from "@/strings";
import { isString } from "@/lib/typeGuards";


const shapes: { name: string; kind: ShapeKind; symbol: string }[] = [
  { name: strings.common.rectangle_03069962, kind: strings.common.rect, symbol: strings.editor.symbol_5a0e6438 }, { name: strings.editor.roundedRectangle, kind: strings.common.roundRect, symbol: strings.editor.symbol_fc3ca900 },
  { name: strings.editor.circle, kind: strings.common.ellipse, symbol: strings.editor.symbol_1f444cd5 }, { name: strings.editor.triangle, kind: strings.common.triangle, symbol: strings.editor.symbol_e3f5e392 },
  { name: strings.editor.rightTriangle, kind: strings.common.rightTriangle, symbol: strings.editor.symbol_802a9611 }, { name: strings.editor.diamond, kind: strings.common.diamond, symbol: strings.editor.symbol_f88c1b77 },
  { name: strings.editor.pentagon, kind: strings.common.pentagon, symbol: strings.editor.symbol_9bef90b4 }, { name: strings.editor.hexagon, kind: strings.common.hexagon, symbol: strings.editor.symbol_60ae181a },
  { name: strings.editor.octagon, kind: strings.common.octagon, symbol: strings.editor.symbol_8b3c3cf6 }, { name: strings.editor.star, kind: strings.common.star5, symbol: strings.editor.symbol_b7927b5b },
  { name: strings.editor.sixPointStar, kind: strings.common.star6, symbol: strings.editor.symbol_f79c9705 }, { name: strings.editor.rightArrow, kind: strings.common.arrowRight, symbol: strings.editor.symbol_16166003 },
  { name: strings.editor.leftArrow, kind: strings.common.arrowLeft, symbol: strings.editor.symbol_774f1d6b }, { name: strings.editor.upArrow, kind: strings.common.arrowUp, symbol: strings.editor.symbol_d2e966bf },
  { name: strings.editor.downArrow, kind: strings.common.arrowDown, symbol: strings.editor.symbol_07a2abcd }, { name: strings.editor.doubleArrow, kind: strings.common.arrowDouble, symbol: strings.editor.symbol_5daa46f8 },
  { name: strings.editor.chevron, kind: strings.common.chevron, symbol: strings.editor.symbol_a2830aef }, { name: strings.editor.parallelogram, kind: strings.common.parallelogram, symbol: strings.editor.symbol_a9c8745b },
  { name: strings.editor.trapezoid, kind: strings.common.trapezoid, symbol: strings.editor.symbol_d99af677 }, { name: strings.editor.plus, kind: strings.common.plus, symbol: strings.editor.symbol_a318c242 },
  { name: strings.editor.heart, kind: strings.common.heart, symbol: strings.editor.symbol_de95b5b0 }, { name: strings.editor.cloud, kind: strings.common.cloud, symbol: strings.editor.symbol_3705f04b },
  { name: strings.editor.callout, kind: strings.common.calloutRect, symbol: strings.editor.symbol_c77c3829 }, { name: strings.editor.ovalCallout, kind: strings.common.calloutEllipse, symbol: strings.editor.symbol_fad17ba4 },
];
const fonts = [strings.common.geist, strings.editor.inter, strings.editor.arial, strings.editor.georgia, strings.editor.timesNewRoman, strings.editor.courierNew, strings.editor.verdana];
const arrangements = [
  [strings.common.front, strings.common.bringToFront], [strings.common.forward, strings.common.bringForward], [strings.common.backward, strings.common.sendBackward], [strings.common.back, strings.common.sendToBack],
  [strings.common.left, strings.common.alignLeft], [strings.common.center, strings.editor.alignCenter], [strings.common.right, strings.editor.alignRight],
  [strings.common.top, strings.editor.alignTop], [strings.common.middle, strings.editor.alignMiddle], [strings.common.bottom, strings.editor.alignBottom],
] as const;

export function Toolbar() {
  const editor = useEditor();
  const fileInput = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string>(strings.common.empty);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(4);
  const [tableColumns, setTableColumns] = useState(3);
  const selected = editor.document.slides.find(s => s.id === editor.activeSlideId)?.elements.filter(e => editor.selection.includes(e.id)) ?? [];
  const text = selected.find((e): e is TextElement => e.type === strings.common.text && !e.locked);
  const setText = (patch: Partial<TextElement>) => editor.mutate(strings.editor.formatText, draft => {
    const slide = draft.slides.find(s => s.id === editor.activeSlideId);
    slide?.elements.forEach(e => { if (editor.selection.includes(e.id) && e.type === strings.common.text && !e.locked) Object.assign(e, patch); });
  });
  const insertTable = () => {
    const element = createElement(strings.common.table);
    if (element.type !== strings.common.table) return;
    element.columnWidths = Array.from({ length: tableColumns }, () => element.width / tableColumns);
    element.rows = Array.from({ length: tableRows }, () => ({
      id: nanoid(), height: element.height / tableRows,
      cells: Array.from({ length: tableColumns }, () => ({ id: nanoid(), content: { type: strings.common.doc, content: [{ type: strings.common.paragraph }] }, fill: { type: strings.common.none }, colSpan: 1, rowSpan: 1 })),
    }));
    editor.mutate(strings.editor.insertTable, draft => { draft.slides.find(slide => slide.id === editor.activeSlideId)?.elements.push(element); });
    editor.select([element.id]);
    editor.setTool(strings.common.select);
    setTableOpen(false);
  };
  const uploadImage = (file: File) => {
    setImageError(strings.common.empty);
    if (!file.type.startsWith(strings.common.image_eb7ede85)) { setImageError(strings.editor.chooseAnImageFile); return; }
    const reader = new FileReader();
    reader.onerror = () => setImageError(strings.editor.thisImageCouldNotBeRead);
    reader.onload = () => {
      if (!isString(reader.result)) return;
      const src = reader.result;
      const image = new Image();
      image.onerror = () => setImageError(strings.editor.thisImageFormatIsNotSupported);
      image.onload = () => {
        const element = createElement(strings.common.image);
        if (element.type !== strings.common.image) return;
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
        state.mutate(strings.common.insertImage, draft => { draft.slides.find(s => s.id === state.activeSlideId)?.elements.push(element); });
        state.select([element.id]);
        state.setTool(strings.common.select);
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  };
  return <div className={strings.editor.editorToolbar} role={strings.common.toolbar} aria-label={strings.editor.slideEditingTools}>
    <Button variant={strings.common.ghost} size={strings.common.icon} title={strings.editor.selectV} aria-label={strings.editor.select} aria-pressed={editor.tool === strings.common.select} className={editor.tool === strings.common.select ? strings.editor.toolActive : strings.common.empty} onClick={() => editor.setTool(strings.common.select)}><MousePointer2 /></Button>
    <Button variant={strings.common.ghost} size={strings.common.icon} title={strings.editor.insertTextT} aria-label={strings.editor.insertText} aria-pressed={editor.tool === strings.common.text} onClick={() => editor.setTool(strings.common.text)}><Type /></Button>
    <DropdownMenu><DropdownMenuTrigger render={<Button variant={strings.common.ghost} className={strings.editor.toolShapes} />} aria-label={strings.editor.insertShape} title={strings.editor.shapes}><Shapes /><ChevronDown size={12} /></DropdownMenuTrigger>
      <DropdownMenuContent className={strings.editor.shapeMenu}>{shapes.map(shape => <DropdownMenuItem key={shape.kind} onClick={() => { if (shape.kind === strings.common.rect || shape.kind === strings.common.ellipse) editor.setTool(shape.kind); else editor.insert(strings.common.shape, shape.kind); }}><span className={strings.editor.shapeSymbol}>{shape.symbol}</span>{shape.name}</DropdownMenuItem>)}<DropdownMenuItem onClick={() => editor.setTool(strings.common.arrow)}><span className={strings.editor.shapeSymbol}>{strings.editor.symbol_ca29edb4}</span>{strings.editor.arrowLine}</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
    <Button variant={strings.common.ghost} size={strings.common.icon} aria-label={strings.editor.insertLine} title={strings.common.line_d7852cd0} aria-pressed={editor.tool === strings.common.line} onClick={() => editor.setTool(strings.common.line)}><Minus /></Button>
    <Button variant={strings.common.ghost} size={strings.common.icon} aria-label={strings.common.uploadImage} title={strings.common.image_1aa4cb0b} onClick={() => fileInput.current?.click()}><ImagePlus /></Button>
    <input hidden ref={fileInput} type={strings.common.file} accept={strings.editor.image} onChange={event => { const file = event.target.files?.[0]; if (file) uploadImage(file); event.target.value = strings.common.empty; }} />
    <Button variant={strings.common.ghost} size={strings.common.icon} aria-label={strings.editor.insertTable} title={strings.common.table_16d1c905} onClick={() => setTableOpen(true)}><Table2 /></Button>
    <Button variant={strings.common.ghost} size={strings.common.icon} aria-label={strings.editor.insertChart} title={strings.common.chart_3e5b90ae} onClick={() => editor.insert(strings.common.chart)}><ChartNoAxesColumn /></Button>
    <span className={strings.editor.toolbarDivider} />
    <DropdownMenu><DropdownMenuTrigger render={<Button variant={strings.common.ghost} className={strings.editor.fontPicker} />} disabled={!text} aria-label={strings.editor.fontFamily}>{text?.fontFamily ?? strings.common.geist}<ChevronDown size={12} /></DropdownMenuTrigger>
      <DropdownMenuContent>{fonts.map(font => <DropdownMenuItem key={font} onClick={() => setText({ fontFamily: font })} style={{ fontFamily: font }}>{font}</DropdownMenuItem>)}</DropdownMenuContent>
    </DropdownMenu>
    <Input key={`${text?.id ?? strings.common.none}${strings.common.symbol_3973e022}${text?.fontSize ?? 48}`} className={strings.editor.toolbarFontSize} aria-label={strings.editor.fontSize} type={strings.common.number} min={1} max={1000} defaultValue={text?.fontSize ?? 48} disabled={!text} onBlur={event => { const value = Number(event.target.value); if (event.target.value.trim() && Number.isFinite(value) && value >= 1 && value <= 1000) { if (value !== text?.fontSize) setText({ fontSize: value }); } else event.target.value = String(text?.fontSize ?? 48); }} onKeyDown={event => { if (event.key === strings.common.enter) event.currentTarget.blur(); if (event.key === strings.common.escape) { event.currentTarget.value = String(text?.fontSize ?? 48); event.currentTarget.blur(); } }} />
    <span className={strings.editor.toolbarDivider} />
    <Button variant={strings.common.ghost} size={strings.common.icon} aria-label={strings.common.bold_94fee62e} title={strings.common.bold_94fee62e} disabled={!text} aria-pressed={text?.bold ?? false} className={text?.bold ? strings.editor.toolActive : strings.common.empty} onClick={() => setText({ bold: !text?.bold })}><Bold /></Button>
    <Button variant={strings.common.ghost} size={strings.common.icon} aria-label={strings.common.italic_9bf37cb5} title={strings.common.italic_9bf37cb5} disabled={!text} aria-pressed={text?.italic ?? false} className={text?.italic ? strings.editor.toolActive : strings.common.empty} onClick={() => setText({ italic: !text?.italic })}><Italic /></Button>
    {([{ value: strings.common.left, Icon: AlignLeft }, { value: strings.common.center, Icon: AlignCenter }, { value: strings.common.right, Icon: AlignRight }] as const).map(({ value, Icon }) => <Button key={value} variant={strings.common.ghost} size={strings.common.icon} aria-label={`${strings.editor.alignText}${value}`} title={`${strings.common.align}${value}`} disabled={!text} aria-pressed={text?.align === value} onClick={() => setText({ align: value })}><Icon /></Button>)}
    <label className={`${strings.editor.toolbarColor}${!text ? strings.editor.isDisabled : strings.common.empty}`} title={strings.editor.textColor}><span style={{ borderBottomColor: text?.color ?? strings.common.color333333 }}>{strings.editor.a}</span><input aria-label={strings.editor.textColor} type={strings.common.color} value={text?.color ?? strings.common.color333333} disabled={!text} onChange={event => setText({ color: event.target.value })} /></label>
    <span className={strings.editor.toolbarDivider} />
    <Popover><PopoverTrigger render={<Button variant={strings.common.ghost} />} disabled={!selected.length}><Layers />{strings.common.arrange}<ChevronDown size={12} /></PopoverTrigger>
      <PopoverContent className={strings.editor.arrangePopover} align={strings.common.end}><span className={strings.editor.panelKicker}>{strings.editor.pOSITIONORDER}</span>{arrangements.map(([value, label]) => <Button variant={strings.common.ghost} key={value} onClick={() => editor.arrange(value)}>{label}</Button>)}<Button variant={strings.common.ghost} disabled={selected.filter(element => !element.locked).length < 3} onClick={() => editor.distribute(strings.common.horizontal)}>{strings.common.distributeHorizontally}</Button><Button variant={strings.common.ghost} disabled={selected.filter(element => !element.locked).length < 3} onClick={() => editor.distribute(strings.common.vertical)}>{strings.common.distributeVertically}</Button><Button variant={strings.common.ghost} disabled={selected.filter(element => !element.locked).length < 2} onClick={() => editor.matchSize(strings.common.width)}>{strings.common.matchWidth}</Button><Button variant={strings.common.ghost} disabled={selected.filter(element => !element.locked).length < 2} onClick={() => editor.matchSize(strings.common.height)}>{strings.common.matchHeight}</Button><Button variant={strings.common.ghost} disabled={selected.filter(element => !element.locked).length < 2} onClick={() => editor.matchSize(strings.common.both)}>{strings.common.matchSize}</Button><Button variant={strings.common.ghost} onClick={() => editor.flip(strings.common.horizontal)}>{strings.common.flipHorizontally}</Button><Button variant={strings.common.ghost} onClick={() => editor.flip(strings.common.vertical)}>{strings.common.flipVertically}</Button></PopoverContent>
    </Popover>
    {imageError && <span className={strings.editor.toolbarError} role={strings.editor.alert}>{imageError}</span>}
    <Dialog open={tableOpen} onOpenChange={setTableOpen}><DialogContent className={strings.editor.tableInsertDialog}><DialogHeader><DialogTitle>{strings.editor.insertTable}</DialogTitle><DialogDescription>{strings.editor.chooseTheNumberOfRowsAndColumnsEditAnd}</DialogDescription></DialogHeader><div className={strings.editor.propertyGrid}><NumberField label={strings.editor.rows_101f2ff3} min={1} max={50} step={1} value={tableRows} onChange={value => setTableRows(Math.round(value))} /><NumberField label={strings.editor.columns} min={1} max={20} step={1} value={tableColumns} onChange={value => setTableColumns(Math.round(value))} /></div><div className={strings.editor.dialogActions}><Button variant={strings.common.outline} onClick={() => setTableOpen(false)}>{strings.common.cancel}</Button><Button onClick={insertTable}>{strings.editor.insertTable}</Button></div></DialogContent></Dialog>
  </div>;
}
