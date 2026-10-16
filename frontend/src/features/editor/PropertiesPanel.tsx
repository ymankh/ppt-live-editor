import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { Maximize, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SlideRenderer } from '@/features/renderer/SlideRenderer';
import { createSlide, layouts } from '@/lib/defaults';
import { useEditor } from '@/store/editor';
import { plainText, textDocument, type AnimationEffect, type Background, type ChartElement, type ShapeKind, type SlideElement, type TableCell, type TableElement } from '@/types/model';
import { FillControl,ShadowControl,StrokeControl } from './PropertyFields';
import { Choice,ColorField,NumberField,Section,Toggle } from '@/components/common/PropertyInputs';
import { LayersPanel } from './LayersPanel';
import './panels.css';
import { strings } from "@/strings";


const palette = [{ name: strings.editor.peach, color: strings.editor.colorf6d9c9 }, { name: strings.editor.cream, color: strings.editor.colorf5f1e8 }, { name: strings.common.white, color: strings.common.colorffffff }, { name: strings.editor.charcoal, color: strings.editor.color282b29 }, { name: strings.editor.lavender, color: strings.editor.colorddd7ef }, { name: strings.common.sage, color: strings.editor.colord6dfcf }];
const shapeKinds: ShapeKind[] = [strings.common.rect, strings.common.roundRect, strings.common.ellipse, strings.common.triangle, strings.common.rightTriangle, strings.common.diamond, strings.common.pentagon, strings.common.hexagon, strings.common.octagon, strings.common.star5, strings.common.star6, strings.common.arrowRight, strings.common.arrowLeft, strings.common.arrowUp, strings.common.arrowDown, strings.common.arrowDouble, strings.common.chevron, strings.common.parallelogram, strings.common.trapezoid, strings.common.plus, strings.common.heart, strings.common.cloud, strings.common.calloutRect, strings.common.calloutEllipse];
const effects: AnimationEffect[] = [strings.common.fadeIn, strings.common.flyInLeft, strings.common.flyInRight, strings.common.flyInTop, strings.common.flyInBottom, strings.common.zoomIn_d60e2474, strings.common.bounceIn, strings.common.rotateIn, strings.common.pulse, strings.common.shake, strings.common.swing, strings.common.flash, strings.common.wobble, strings.common.fadeOut, strings.common.flyOutLeft, strings.common.flyOutRight, strings.common.flyOutTop, strings.common.flyOutBottom, strings.common.zoomOut_77016e00];

function emptyCell(): TableCell {
  return { id: nanoid(), content: textDocument(strings.common.empty), fill: { type: strings.common.none }, colSpan: 1, rowSpan: 1 };
}

function tableGrid(table: TableElement): TableCell[][] {
  const grid: (TableCell | undefined)[][] = table.rows.map(() => Array.from({ length: table.columnWidths.length }, () => undefined));
  table.rows.forEach((row, rowIndex) => {
    let column = 0;
    row.cells.forEach(cell => {
      while (grid[rowIndex]?.[column]) column++;
      for (let y = rowIndex; y < Math.min(table.rows.length, rowIndex + cell.rowSpan); y++) {
        for (let x = column; x < Math.min(table.columnWidths.length, column + cell.colSpan); x++) {
          const target = grid[y];
          if (target) target[x] = cell;
        }
      }
      column += cell.colSpan;
    });
  });
  return grid.map(row => row.map(cell => cell ?? emptyCell()));
}

function tableFromGrid(table: TableElement, grid: TableCell[][]): TableElement {
  const seen = new Set<string>();
  return { ...table, rows: grid.map((row, y) => ({
    id: table.rows[y]?.id ?? nanoid(), height: table.rows[y]?.height ?? 70,
    cells: row.flatMap((cell, x) => {
      if (seen.has(cell.id)) return [];
      seen.add(cell.id);
      let colSpan = 1, rowSpan = 1;
      while (row[x + colSpan]?.id === cell.id) colSpan++;
      while (grid[y + rowSpan]?.[x]?.id === cell.id) rowSpan++;
      return [{ ...cell, colSpan, rowSpan }];
    }),
  })) };
}

function TableDataEditor({ table, onChange }: { table: TableElement; onChange: (value: TableElement) => void }) {
  const [draft, setDraft] = useState<TableElement | null>(null);
  const [selection, setSelection] = useState<{ row: number; column: number }[]>([]);
  const grid = draft ? tableGrid(draft) : [];
  const first = selection[0];
  const last = selection.at(-1);
  const top = Math.min(first?.row ?? 0, last?.row ?? 0), bottom = Math.max(first?.row ?? 0, last?.row ?? 0);
  const left = Math.min(first?.column ?? 0, last?.column ?? 0), right = Math.max(first?.column ?? 0, last?.column ?? 0);
  const ids = new Set(grid.slice(top, bottom + 1).flatMap(row => row.slice(left, right + 1).map(cell => cell.id)));
  const canMerge = selection.length > 0 && ids.size > 1 && grid.every((row, y) => row.every((cell, x) => !ids.has(cell.id) || (y >= top && y <= bottom && x >= left && x <= right)));
  const selectedCell = grid[first?.row ?? -1]?.[first?.column ?? -1];
  const updateCell = (id: string, patch: Partial<TableCell>) => {
    if (draft) setDraft({ ...draft, rows: draft.rows.map(row => ({ ...row, cells: row.cells.map(cell => cell.id === id ? { ...cell, ...patch } : cell) })) });
  };
  const merge = () => {
    if (!draft || !canMerge) return;
    const anchor = grid[top]?.[left];
    if (!anchor) return;
    const cells = draft.rows.flatMap(row => row.cells).filter(cell => ids.has(cell.id));
    const content = { type: strings.common.doc, content: cells.flatMap(cell => cell.content.content ?? []) };
    const merged = { ...anchor, content };
    setDraft(tableFromGrid(draft, grid.map((row, y) => row.map((cell, x) => y >= top && y <= bottom && x >= left && x <= right ? merged : cell))));
    setSelection([{ row: top, column: left }]);
  };
  const split = () => {
    if (!draft || !selectedCell) return;
    let retained = false;
    setDraft(tableFromGrid(draft, grid.map(row => row.map(cell => {
      if (cell.id !== selectedCell.id) return cell;
      if (!retained) { retained = true; return { ...cell, colSpan: 1, rowSpan: 1 }; }
      return { ...emptyCell(), fill: cell.fill };
    }))));
  };
  const changeDimension = (axis: 'row' | 'column', remove: boolean) => {
    if (!draft) return;
    if (axis === strings.editor.row) {
      if (remove && (!first || grid.length <= 1)) return;
      const nextGrid = remove ? grid.filter((_, index) => index !== first?.row) : [...grid, draft.columnWidths.map(emptyCell)];
      const rows = remove ? draft.rows.filter((_, index) => index !== first?.row) : [...draft.rows, { id: nanoid(), height: 70, cells: [] }];
      setDraft(tableFromGrid({ ...draft, rows }, nextGrid));
    } else {
      if (remove && (!first || draft.columnWidths.length <= 1)) return;
      const columnWidths = remove ? draft.columnWidths.filter((_, index) => index !== first?.column) : [...draft.columnWidths, 180];
      const nextGrid = grid.map(row => remove ? row.filter((_, index) => index !== first?.column) : [...row, emptyCell()]);
      setDraft(tableFromGrid({ ...draft, columnWidths }, nextGrid));
    }
    setSelection([]);
  };
  return <>
    <p className={strings.editor.propertyNote}>{table.rows.length}{strings.editor.rows}{table.columnWidths.length}{strings.editor.columnsSelectARangeToMergeSplitAMerged}</p>
    <Button variant={strings.common.outline} size={strings.common.sm} disabled={table.locked} onClick={() => { setDraft(structuredClone(table)); setSelection([]); }}>{strings.editor.editTableData}</Button>
    <Dialog open={draft !== null} onOpenChange={open => { if (!open) setDraft(null); }}><DialogContent className={strings.editor.dataDialog}><DialogHeader><DialogTitle>{strings.editor.editTable}</DialogTitle><DialogDescription>{strings.editor.clickACellToSelectItShiftClickAnother}</DialogDescription></DialogHeader>
      {draft && <>
        <div className={strings.editor.dataDialogTools}><Button variant={strings.common.outline} size={strings.common.sm} onClick={() => changeDimension(strings.editor.row, false)}><Plus size={12} />{strings.editor.row_95110d74}</Button><Button variant={strings.common.outline} size={strings.common.sm} onClick={() => changeDimension(strings.editor.column_881d5fb6, false)}><Plus size={12} />{strings.editor.column_3fdc9a58}</Button><Button variant={strings.common.outline} size={strings.common.sm} disabled={!first || draft.rows.length <= 1} onClick={() => changeDimension(strings.editor.row, true)}>{strings.editor.deleteRow}</Button><Button variant={strings.common.outline} size={strings.common.sm} disabled={!first || draft.columnWidths.length <= 1} onClick={() => changeDimension(strings.editor.column_881d5fb6, true)}>{strings.editor.deleteColumn}</Button><Button variant={strings.common.outline} size={strings.common.sm} disabled={!canMerge} onClick={merge}>{strings.editor.mergeCells}</Button><Button variant={strings.common.outline} size={strings.common.sm} disabled={!selectedCell || (selectedCell.colSpan === 1 && selectedCell.rowSpan === 1)} onClick={split}>{strings.editor.splitCell}</Button></div>
        <div className={strings.editor.dataSheetScroll}><table className={strings.editor.dataSheet}><thead><tr><th scope={strings.common.col}>{strings.editor.row_95110d74}</th>{draft.columnWidths.map((width, column) => <th key={column} scope={strings.common.col}><NumberField label={`${strings.editor.column_dcd5af6a}${column + 1}${strings.editor.width}`} value={width} min={10} onChange={value => setDraft({ ...draft, columnWidths: draft.columnWidths.map((item, index) => index === column ? value : item) })} /></th>)}</tr></thead><tbody>{draft.rows.map((row, y) => <tr key={row.id}><th scope={strings.editor.row}><NumberField label={`${strings.editor.row_248dda40}${y + 1}${strings.editor.height}`} value={row.height} min={10} onChange={height => setDraft({ ...draft, rows: draft.rows.map(item => item.id === row.id ? { ...item, height } : item) })} /></th>{grid[y]?.map((cell, x) => {
          if (grid[y]?.[x - 1]?.id === cell.id || grid[y - 1]?.[x]?.id === cell.id) return null;
          const selected = ids.has(cell.id) && selection.length > 0;
          return <td key={cell.id} colSpan={cell.colSpan} rowSpan={cell.rowSpan} className={selected ? strings.common.isSelected : strings.common.empty}><Input aria-label={`${strings.editor.row_248dda40}${y + 1}${strings.editor.column}${x + 1}`} value={plainText(cell.content)} onClick={event => setSelection(event.shiftKey && first ? [first, { row: y + cell.rowSpan - 1, column: x + cell.colSpan - 1 }] : [{ row: y, column: x }, { row: y + cell.rowSpan - 1, column: x + cell.colSpan - 1 }])} onChange={event => updateCell(cell.id, { content: textDocument(event.target.value) })} /></td>;
        })}</tr>)}</tbody></table></div>
        {selectedCell && <ColorField label={strings.editor.selectedCellFill} value={selectedCell.fill.type === strings.common.solid ? selectedCell.fill.color : strings.common.colorffffff} onChange={color => updateCell(selectedCell.id, { fill: { type: strings.common.solid, color } })} />}
        <div className={strings.editor.dialogActions}><Button variant={strings.common.outline} onClick={() => setDraft(null)}>{strings.common.cancel}</Button><Button onClick={() => { onChange(draft); setDraft(null); }}>{strings.editor.saveTable}</Button></div>
      </>}
    </DialogContent></Dialog>
  </>;
}

function ChartDataEditor({ chart, onChange }: { chart: ChartElement; onChange: (value: Pick<ChartElement, 'categories' | 'series'>) => void }) {
  const [draft, setDraft] = useState<{ categories: string[]; series: { id: string; name: string; color: string; values: string[] }[] } | null>(null);
  const valid = draft?.series.every(series => series.values.every(value => value.trim() !== strings.common.empty && Number.isFinite(Number(value)))) ?? false;
  return <>
    <p className={strings.editor.propertyNote}>{chart.categories.length}{strings.editor.categories}{chart.series.length}{strings.editor.series}</p>
    <Button variant={strings.common.outline} size={strings.common.sm} disabled={chart.locked} onClick={() => setDraft({ categories: [...chart.categories], series: chart.series.map(series => ({ ...series, values: chart.categories.map((_, index) => String(series.values[index] ?? 0)) })) })}>{strings.editor.editChartData}</Button>
    <Dialog open={draft !== null} onOpenChange={open => { if (!open) setDraft(null); }}><DialogContent className={strings.editor.dataDialog}><DialogHeader><DialogTitle>{strings.editor.chartData}</DialogTitle><DialogDescription>{strings.editor.editCategoriesAndSeriesInTheSpreadsheetEachValue}</DialogDescription></DialogHeader>
      {draft && <>
        <div className={strings.editor.dataDialogTools}><Button variant={strings.common.outline} size={strings.common.sm} onClick={() => setDraft({ categories: [...draft.categories, `${strings.editor.category}${draft.categories.length + 1}`], series: draft.series.map(series => ({ ...series, values: [...series.values, strings.common.value0] })) })}><Plus size={12} />{strings.common.category}</Button><Button variant={strings.common.outline} size={strings.common.sm} onClick={() => setDraft({ ...draft, series: [...draft.series, { id: nanoid(), name: `${strings.common.series}${draft.series.length + 1}`, color: strings.common.colored7355, values: draft.categories.map(() => strings.common.value0) }] })}><Plus size={12} />{strings.editor.series_a8295e08}</Button></div>
        <div className={strings.editor.dataSheetScroll}><table className={strings.editor.dataSheet}><thead><tr><th scope={strings.common.col}>{strings.common.category}</th>{draft.series.map(series => <th key={series.id} scope={strings.common.col}><Input aria-label={strings.editor.seriesName} value={series.name} onChange={event => setDraft({ ...draft, series: draft.series.map(item => item.id === series.id ? { ...item, name: event.target.value } : item) })} /><div className={strings.editor.dataSeriesTools}><input type={strings.common.color} aria-label={`${series.name}${strings.editor.color}`} value={series.color} onChange={event => setDraft({ ...draft, series: draft.series.map(item => item.id === series.id ? { ...item, color: event.target.value } : item) })} /><Button variant={strings.common.ghost} size={strings.common.iconSm} aria-label={`${strings.editor.removeSeries}${series.name}`} disabled={draft.series.length <= 1} onClick={() => setDraft({ ...draft, series: draft.series.filter(item => item.id !== series.id) })}><Trash2 size={12} /></Button></div></th>)}<th /></tr></thead><tbody>{draft.categories.map((category, row) => <tr key={row}><th scope={strings.editor.row}><Input aria-label={`${strings.editor.category}${row + 1}`} value={category} onChange={event => setDraft({ ...draft, categories: draft.categories.map((item, index) => index === row ? event.target.value : item) })} /></th>{draft.series.map(series => <td key={series.id}><Input aria-label={`${series.name}${strings.editor.value}${row + 1}`} inputMode={strings.editor.decimal} value={series.values[row] ?? strings.common.empty} aria-invalid={!series.values[row]?.trim() || !Number.isFinite(Number(series.values[row]))} onChange={event => setDraft({ ...draft, series: draft.series.map(item => item.id === series.id ? { ...item, values: item.values.map((value, index) => index === row ? event.target.value : value) } : item) })} /></td>)}<td><Button variant={strings.common.ghost} size={strings.common.iconSm} aria-label={`${strings.editor.removeCategory}${row + 1}`} disabled={draft.categories.length <= 1} onClick={() => setDraft({ categories: draft.categories.filter((_, index) => index !== row), series: draft.series.map(series => ({ ...series, values: series.values.filter((_, index) => index !== row) })) })}><Trash2 size={12} /></Button></td></tr>)}</tbody></table></div>
        {!valid && <p className={strings.editor.dataError} role={strings.editor.alert}>{strings.editor.enterANumberInEveryValueCellBeforeSaving}</p>}
        <div className={strings.editor.dialogActions}><Button variant={strings.common.outline} onClick={() => setDraft(null)}>{strings.common.cancel}</Button><Button disabled={!valid} onClick={() => { onChange({ categories: draft.categories, series: draft.series.map(series => ({ ...series, values: series.values.map(Number) })) }); setDraft(null); }}>{strings.editor.saveChartData}</Button></div>
      </>}
    </DialogContent></Dialog>
  </>;
}

export function PropertiesPanel() {
  const editor = useEditor();
  const [tab, setTab] = useState<string>(strings.common.slide);
  const slide = editor.document.slides.find(item => item.id === editor.activeSlideId);
  const selected = slide?.elements.filter(element => editor.selection.includes(element.id)) ?? [];
  const element = selected[0];
  useEffect(() => { setTab(previous => previous === strings.editor.layers_e3b81689 ? previous : element ? strings.editor.style : strings.common.slide); }, [element?.id]);
  if (!slide) return null;
  const set = (patch: Partial<SlideElement>) => { if (element) editor.updateElement(element.id, patch); };
  const setGeometry = (key: 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity', value: number) => editor.mutate(strings.editor.transformElements, draft => {
    draft.slides.find(item => item.id === slide.id)?.elements.forEach(item => { if (editor.selection.includes(item.id) && !item.locked) item[key] = value; });
  });
  const setBackground = (background: Background) => editor.mutate(strings.editor.changeSlideBackground, draft => { const target = draft.slides.find(item => item.id === slide.id); if (target) target.background = background; });
  return <aside className={strings.editor.propertiesPanel} aria-label={strings.editor.designProperties}>
    <div className={strings.common.panelHeader}><h2>{strings.editor.design}</h2><SlidersHorizontal size={16} className={strings.editor.panelMuted} /></div>
    <Tabs value={tab} onValueChange={value => setTab(String(value))} className={strings.editor.propertiesTabs}><TabsList variant={strings.common.line} className={strings.editor.propertiesTabList}><TabsTrigger value={strings.common.slide}>{strings.common.slide_6bb4c117}</TabsTrigger><TabsTrigger value={strings.editor.style}>{strings.editor.style_7e744141}</TabsTrigger><TabsTrigger value={strings.editor.layers_e3b81689}>{strings.editor.layers_0bcd66e6}</TabsTrigger></TabsList>
      <div className={strings.editor.propertiesScroll}><TabsContent value={strings.common.slide}>
        <Section title={strings.editor.background_ea2b8a87}><div className={strings.editor.backgroundPalette}>{palette.map(color => <button type={strings.common.button} key={color.name} title={color.name} aria-label={`${color.name}${strings.editor.background}`} aria-pressed={slide.background.type === strings.common.solid && slide.background.color === color.color} className={slide.background.type === strings.common.solid && slide.background.color === color.color ? strings.editor.selected : strings.common.empty} style={{ backgroundColor: color.color }} onClick={() => setBackground({ type: strings.common.solid, color: color.color })} />)}</div><FillControl value={slide.background} allowNone={false} onChange={value => { if (value.type !== strings.common.none) setBackground(value); }} /></Section>
        <Section title={strings.editor.layout}><div className={strings.editor.propertyLayoutGrid}>{layouts.map(layout => <button key={layout.id} className={`${strings.editor.propertyLayout}${slide.layoutId === layout.id ? strings.editor.selected : strings.common.empty}`} title={layout.name} onClick={() => editor.mutate(strings.editor.changeSlideLayout, draft => { const target = draft.slides.find(item => item.id === slide.id); if (target) { const next = createSlide(layout.id); target.elements = next.elements; target.layoutId = layout.id; } })}><div className={strings.editor.propertyLayoutPreview}><SlideRenderer slide={createSlide(layout.id)} theme={editor.document.theme} width={1920} /></div><span>{layout.name}</span></button>)}</div></Section>
        <Section title={strings.editor.transition}><Choice label={strings.editor.effect} value={slide.transition.effect} options={[{ value: strings.common.none, label: strings.editor.none }, { value: strings.common.fade, label: strings.editor.fade }, { value: strings.common.slideLeft, label: strings.editor.slideLeft }, { value: strings.common.slideRight, label: strings.editor.slideRight }, { value: strings.common.push, label: strings.editor.push }, { value: strings.common.zoom, label: strings.editor.zoom }, { value: strings.common.flip, label: strings.editor.flip }, { value: strings.common.cube, label: strings.editor.cube }]} onChange={effect => editor.mutate(strings.editor.changeTransition, draft => { const target = draft.slides.find(item => item.id === slide.id); if (target) target.transition.effect = effect; })} /><NumberField label={strings.editor.durationSeconds} min={0} step={.1} value={slide.transition.duration} onChange={duration => editor.mutate(strings.editor.changeTransitionDuration, draft => { const target = draft.slides.find(item => item.id === slide.id); if (target) target.transition.duration = duration; })} /></Section>
        <Section title={strings.editor.slideSize}><div className={strings.editor.slideSizeCard}><Maximize size={18} /><div><strong>{editor.document.slideSize.width / editor.document.slideSize.height === 16 / 9 ? strings.editor.widescreen169 : strings.editor.customSize}</strong><span>{editor.document.slideSize.width}{strings.common.symbol_20dd86b3}{editor.document.slideSize.height}{strings.editor.px}</span></div></div><div className={strings.editor.propertyGrid}><NumberField label={strings.editor.width_3019947b} min={320} value={editor.document.slideSize.width} onChange={width => editor.mutate(strings.editor.resizePresentation, draft => { draft.slideSize.width = width; })} /><NumberField label={strings.editor.height_bfe2eca4} min={180} value={editor.document.slideSize.height} onChange={height => editor.mutate(strings.editor.resizePresentation, draft => { draft.slideSize.height = height; })} /></div></Section>
      </TabsContent>
      <TabsContent value={strings.editor.style}>{element ? <>
        <Section title={selected.length > 1 ? `${selected.length}${strings.editor.elementsSelected}` : `${element.type.charAt(0).toUpperCase()}${element.type.slice(1)}${strings.editor.properties}`}><label className={strings.common.propertyField}><span>{strings.editor.name}</span><Input value={element.name} onChange={event => set({ name: event.target.value })} /></label><div className={strings.editor.propertyGrid}>{([strings.common.x, strings.common.y, strings.common.width, strings.common.height, strings.editor.rotation] as const).map(key => <NumberField key={key} label={key === strings.editor.rotation ? strings.editor.rotation_bb11fc61 : key === strings.common.width ? strings.editor.w : key === strings.common.height ? strings.editor.h : key.toUpperCase()} value={element[key]} {...(key === strings.common.width || key === strings.common.height ? { min: 1 } : {})} onChange={value => setGeometry(key, value)} />)}<NumberField label={strings.editor.opacity_074aeca5} value={element.opacity * 100} min={0} max={100} onChange={value => setGeometry(strings.editor.opacity, value / 100)} /></div><div className={strings.editor.propertyButtonRow}><Toggle label={strings.editor.locked} value={element.locked} onChange={locked => set({ locked })} /><Toggle label={strings.editor.hidden} value={element.hidden} onChange={hidden => set({ hidden })} /></div></Section>
        {strings.common.fill in element && <Section title={strings.editor.fill}><FillControl value={element.fill} allowTile={element.type !== strings.common.shape} onChange={fill => set({ fill })} /></Section>}
        {element.type === strings.common.text && <><Section title={strings.editor.typography}><label className={strings.common.propertyField}><span>{strings.common.text_71988c4d}</span><Textarea value={plainText(element.content)} onChange={event => set({ content: textDocument(event.target.value) })} /></label><Choice label={strings.editor.font} value={element.fontFamily} options={[strings.common.geist, strings.editor.inter, strings.editor.arial, strings.editor.georgia, strings.editor.timesNewRoman, strings.editor.courierNew, strings.editor.verdana]} onChange={fontFamily => set({ fontFamily })} /><div className={strings.editor.propertyGrid}><NumberField label={strings.editor.fontSize} min={1} value={element.fontSize} onChange={fontSize => set({ fontSize })} /><NumberField label={strings.editor.letterSpacing} value={element.letterSpacing} step={.1} onChange={letterSpacing => set({ letterSpacing })} /></div><ColorField label={strings.editor.textColor} value={element.color} onChange={color => set({ color })} /><div className={strings.editor.propertyButtonRow}><Toggle label={strings.common.bold_94fee62e} value={element.bold} onChange={bold => set({ bold })} /><Toggle label={strings.common.italic_9bf37cb5} value={element.italic} onChange={italic => set({ italic })} /></div><Choice label={strings.editor.alignment} value={element.align} options={[strings.common.left, strings.common.center, strings.common.right]} onChange={align => set({ align })} /><Choice label={strings.editor.verticalAlignment} value={element.verticalAlign} options={[strings.common.top, strings.common.middle, strings.common.bottom]} onChange={verticalAlign => set({ verticalAlign })} /><NumberField label={strings.editor.padding} value={element.padding} min={0} onChange={padding => set({ padding })} /></Section></>}
        {element.type === strings.common.shape && <Section title={strings.common.shape_e0e49270}><Choice label={strings.common.shape_e0e49270} value={element.shape} options={shapeKinds} onChange={shape => set({ shape })} /><div className={strings.editor.propertyButtonRow}><Toggle label={strings.editor.flipHorizontal} value={element.flipH} onChange={flipH => set({ flipH })} /><Toggle label={strings.editor.flipVertical} value={element.flipV} onChange={flipV => set({ flipV })} /></div><label className={strings.common.propertyField}><span>{strings.editor.shapeText}</span><Textarea value={element.text ? plainText(element.text) : strings.common.empty} onChange={event => set({ text: event.target.value ? textDocument(event.target.value) : null })} /></label><Choice label={strings.editor.textPosition} value={element.textVerticalAlign} options={[strings.common.top, strings.common.middle, strings.common.bottom]} onChange={textVerticalAlign => set({ textVerticalAlign })} /></Section>}
        {element.type === strings.common.line && <Section title={strings.common.line_d7852cd0}><Choice label={strings.editor.path} value={element.curve} options={[strings.common.straight, strings.common.elbow, strings.common.curved]} onChange={curve => set({ curve })} />{([strings.common.start, strings.common.end] as const).map(point => <div className={strings.editor.propertyGrid} key={point}>{([strings.common.x, strings.common.y] as const).map(axis => <NumberField key={axis} label={`${point}${strings.common.space}${axis}`} value={element[point][axis]} onChange={value => set({ [point]: { ...element[point], [axis]: value } })} />)}</div>)}<Choice label={strings.editor.startArrow} value={element.startArrow} options={[strings.common.none, strings.common.arrow, strings.common.triangle, strings.common.circle, strings.common.diamond, strings.common.bar]} onChange={startArrow => set({ startArrow })} /><Choice label={strings.editor.endArrow} value={element.endArrow} options={[strings.common.none, strings.common.arrow, strings.common.triangle, strings.common.circle, strings.common.diamond, strings.common.bar]} onChange={endArrow => set({ endArrow })} /></Section>}
        {element.type === strings.common.image && <><Section title={strings.common.image_1aa4cb0b}><label className={strings.common.propertyField}><span>{strings.editor.imageURL}</span><Input value={element.assetId.startsWith(strings.editor.data) ? strings.common.empty : element.assetId} placeholder={element.assetId.startsWith(strings.editor.data) ? strings.editor.uploadedImage : strings.editor.https_ab04e20e} onChange={event => set({ assetId: event.target.value })} /></label><span className={strings.editor.propertyNote}>{strings.editor.original}{element.naturalWidth}{strings.common.symbol_20dd86b3}{element.naturalHeight}{strings.editor.px}</span><Choice label={strings.editor.mask} value={element.clipShape} options={[strings.common.none, strings.common.ellipse, strings.common.roundRect]} onChange={clipShape => set({ clipShape })} /><div className={strings.editor.propertyButtonRow}><Toggle label={strings.editor.flipHorizontal} value={element.flipH} onChange={flipH => set({ flipH })} /><Toggle label={strings.editor.flipVertical} value={element.flipV} onChange={flipV => set({ flipV })} /></div></Section><Section title={strings.editor.crop}><div className={strings.editor.propertyGrid}>{([strings.common.x, strings.common.y, strings.common.width, strings.common.height] as const).map(key => <NumberField key={key} label={key} value={element.crop[key]} min={0} max={1} step={.01} onChange={value => set({ crop: { ...element.crop, [key]: value } })} />)}</div></Section><Section title={strings.editor.imageAdjustments}>{([strings.editor.brightness, strings.editor.contrast, strings.editor.saturation, strings.common.blur, strings.editor.grayscale] as const).map(key => <NumberField key={key} label={key} value={element.filters[key]} min={0} {...(key === strings.editor.grayscale ? { max: 1 } : {})} step={key === strings.common.blur ? 1 : .1} onChange={value => set({ filters: { ...element.filters, [key]: value } })} />)}</Section></>}
        {element.type === strings.common.table && <><Section title={strings.editor.tableStyle}><div className={strings.editor.propertyButtonRow}><Toggle label={strings.editor.headerRow} value={element.style.headerRow} onChange={headerRow => set({ style: { ...element.style, headerRow } })} /><Toggle label={strings.editor.bandedRows} value={element.style.bandedRows} onChange={bandedRows => set({ style: { ...element.style, bandedRows } })} /></div><ColorField label={strings.editor.borderColor} value={element.style.borderColor} onChange={borderColor => set({ style: { ...element.style, borderColor } })} /><NumberField label={strings.editor.borderWidth} value={element.style.borderWidth} min={0} onChange={borderWidth => set({ style: { ...element.style, borderWidth } })} /><FillControl value={element.style.headerFill} onChange={headerFill => set({ style: { ...element.style, headerFill } })} /></Section><Section title={strings.editor.tableData}><TableDataEditor key={element.id} table={element} onChange={value => set({ rows: value.rows, columnWidths: value.columnWidths })} /></Section></>}
        {element.type === strings.common.chart && <><Section title={strings.common.chart_3e5b90ae}><Choice label={strings.editor.type} value={element.chart} options={[strings.common.bar, strings.common.barHorizontal, strings.common.line, strings.common.area, strings.common.pie, strings.common.donut, strings.common.scatter]} onChange={chart => set({ chart })} /><label className={strings.common.propertyField}><span>{strings.editor.title}</span><Input value={element.options.title} onChange={event => set({ options: { ...element.options, title: event.target.value } })} /></label><div className={strings.editor.propertyButtonRow}>{([strings.editor.showLegend, strings.editor.showGrid, strings.editor.showValues, strings.common.stacked] as const).map(key => <Toggle key={key} label={key.replace(strings.common.show, strings.common.empty)} value={element.options[key]} onChange={value => set({ options: { ...element.options, [key]: value } })} />)}</div></Section><Section title={strings.editor.chartData}><ChartDataEditor key={element.id} chart={element} onChange={set} /></Section></>}
        {strings.editor.stroke in element && <Section title={strings.editor.outline}><StrokeControl value={element.stroke} required={element.type === strings.common.line} onChange={stroke => { if (element.type !== strings.common.line || stroke) set({ stroke }); }} /></Section>}
        {strings.editor.cornerRadius in element && <Section title={strings.editor.corners}><NumberField label={strings.editor.radius} min={0} value={element.cornerRadius} onChange={cornerRadius => set({ cornerRadius })} /></Section>}
        {strings.editor.shadow in element && <Section title={strings.editor.shadow_4c764cb6}><ShadowControl value={element.shadow} onChange={shadow => set({ shadow })} /></Section>}
        <Section title={strings.editor.link}><Choice label={strings.editor.linkTo} value={element.link?.kind ?? strings.common.none} options={[strings.common.none, strings.common.url, strings.common.slide]} onChange={kind => {
          if (kind === strings.common.none) editor.mutate(strings.editor.removeLink, draft => { const target = draft.slides.find(item => item.id === slide.id)?.elements.find(item => item.id === element.id); if (target) delete target.link; });
          else set({ link: kind === strings.common.url ? { kind, href: strings.editor.https } : { kind, slideId: slide.id } });
        }} />{element.link?.kind === strings.common.url && <Input aria-label={strings.editor.linkURL} value={element.link.href} onChange={event => set({ link: { kind: strings.common.url, href: event.target.value } })} />}{element.link?.kind === strings.common.slide && <Choice label={strings.editor.destination} value={element.link.slideId} options={editor.document.slides.map((item, index) => ({ value: item.id, label: `${strings.common.slide_ff1e0604}${index + 1}` }))} onChange={slideId => set({ link: { kind: strings.common.slide, slideId } })} />}</Section>
        <Section title={strings.editor.animations}>{element.animations.map(animation => <div className={strings.editor.animationEditor} key={animation.id}><Choice label={strings.common.category} value={animation.category} options={[strings.common.entrance, strings.common.emphasis, strings.common.exit]} onChange={category => set({ animations: element.animations.map(item => item.id === animation.id ? { ...item, category } : item) })} /><Choice label={strings.editor.effect} value={animation.effect} options={effects} onChange={effect => set({ animations: element.animations.map(item => item.id === animation.id ? { ...item, effect } : item) })} /><Choice label={strings.editor.trigger} value={animation.trigger} options={[strings.common.onClick, strings.common.withPrevious, strings.common.afterPrevious]} onChange={trigger => set({ animations: element.animations.map(item => item.id === animation.id ? { ...item, trigger } : item) })} /><div className={strings.editor.propertyGrid}>{([strings.editor.duration, strings.editor.delay] as const).map(key => <NumberField key={key} label={`${key}${strings.editor.s}`} min={0} step={.1} value={animation[key]} onChange={value => set({ animations: element.animations.map(item => item.id === animation.id ? { ...item, [key]: value } : item) })} />)}</div><Button size={strings.common.sm} variant={strings.common.destructive} onClick={() => set({ animations: element.animations.filter(item => item.id !== animation.id) })}>{strings.editor.removeAnimation}</Button></div>)}<Button size={strings.common.sm} variant={strings.common.outline} onClick={() => set({ animations: [...element.animations, { id: nanoid(), category: strings.common.entrance, effect: strings.common.fadeIn, trigger: strings.common.onClick, duration: .5, delay: 0 }] })}><Plus size={12} />{strings.editor.addAnimation}</Button></Section>
      </> : <div className={strings.editor.propertiesEmpty}><SlidersHorizontal size={26} /><strong>{strings.editor.makeItYourOwn}</strong><span>{strings.editor.selectAnElementToEditItsPositionColorAnd}</span></div>}</TabsContent>
      <TabsContent value={strings.editor.layers_e3b81689}><LayersPanel slide={slide} /></TabsContent>
      </div>
    </Tabs>
    <div className={strings.editor.designFooter}><span className={strings.editor.designStatusDot} />{strings.editor.everyDetailConsidered}</div>
  </aside>;
}
