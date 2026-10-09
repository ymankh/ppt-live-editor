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

const palette = [{ name: 'Peach', color: '#f6d9c9' }, { name: 'Cream', color: '#f5f1e8' }, { name: 'White', color: '#ffffff' }, { name: 'Charcoal', color: '#282b29' }, { name: 'Lavender', color: '#ddd7ef' }, { name: 'Sage', color: '#d6dfcf' }];
const shapeKinds: ShapeKind[] = ['rect', 'roundRect', 'ellipse', 'triangle', 'rightTriangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star5', 'star6', 'arrowRight', 'arrowLeft', 'arrowUp', 'arrowDown', 'arrowDouble', 'chevron', 'parallelogram', 'trapezoid', 'plus', 'heart', 'cloud', 'calloutRect', 'calloutEllipse'];
const effects: AnimationEffect[] = ['fadeIn', 'flyInLeft', 'flyInRight', 'flyInTop', 'flyInBottom', 'zoomIn', 'bounceIn', 'rotateIn', 'pulse', 'shake', 'swing', 'flash', 'wobble', 'fadeOut', 'flyOutLeft', 'flyOutRight', 'flyOutTop', 'flyOutBottom', 'zoomOut'];

function emptyCell(): TableCell {
  return { id: nanoid(), content: textDocument(''), fill: { type: 'none' }, colSpan: 1, rowSpan: 1 };
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
    const content = { type: 'doc', content: cells.flatMap(cell => cell.content.content ?? []) };
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
    if (axis === 'row') {
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
    <p className="property-note">{table.rows.length} rows × {table.columnWidths.length} columns. Select a range to merge; split a merged cell to restore individual cells.</p>
    <Button variant="outline" size="sm" disabled={table.locked} onClick={() => { setDraft(structuredClone(table)); setSelection([]); }}>Edit table data</Button>
    <Dialog open={draft !== null} onOpenChange={open => { if (!open) setDraft(null); }}><DialogContent className="data-dialog"><DialogHeader><DialogTitle>Edit table</DialogTitle><DialogDescription>Click a cell to select it. Shift-click another cell to select a rectangular range. Changes apply together when you save.</DialogDescription></DialogHeader>
      {draft && <>
        <div className="data-dialog-tools"><Button variant="outline" size="sm" onClick={() => changeDimension('row', false)}><Plus size={12} />Row</Button><Button variant="outline" size="sm" onClick={() => changeDimension('column', false)}><Plus size={12} />Column</Button><Button variant="outline" size="sm" disabled={!first || draft.rows.length <= 1} onClick={() => changeDimension('row', true)}>Delete row</Button><Button variant="outline" size="sm" disabled={!first || draft.columnWidths.length <= 1} onClick={() => changeDimension('column', true)}>Delete column</Button><Button variant="outline" size="sm" disabled={!canMerge} onClick={merge}>Merge cells</Button><Button variant="outline" size="sm" disabled={!selectedCell || (selectedCell.colSpan === 1 && selectedCell.rowSpan === 1)} onClick={split}>Split cell</Button></div>
        <div className="data-sheet-scroll"><table className="data-sheet"><thead><tr><th scope="col">Row</th>{draft.columnWidths.map((width, column) => <th key={column} scope="col"><NumberField label={`Column ${column + 1} width`} value={width} min={10} onChange={value => setDraft({ ...draft, columnWidths: draft.columnWidths.map((item, index) => index === column ? value : item) })} /></th>)}</tr></thead><tbody>{draft.rows.map((row, y) => <tr key={row.id}><th scope="row"><NumberField label={`Row ${y + 1} height`} value={row.height} min={10} onChange={height => setDraft({ ...draft, rows: draft.rows.map(item => item.id === row.id ? { ...item, height } : item) })} /></th>{grid[y]?.map((cell, x) => {
          if (grid[y]?.[x - 1]?.id === cell.id || grid[y - 1]?.[x]?.id === cell.id) return null;
          const selected = ids.has(cell.id) && selection.length > 0;
          return <td key={cell.id} colSpan={cell.colSpan} rowSpan={cell.rowSpan} className={selected ? 'is-selected' : ''}><Input aria-label={`Row ${y + 1} column ${x + 1}`} value={plainText(cell.content)} onClick={event => setSelection(event.shiftKey && first ? [first, { row: y + cell.rowSpan - 1, column: x + cell.colSpan - 1 }] : [{ row: y, column: x }, { row: y + cell.rowSpan - 1, column: x + cell.colSpan - 1 }])} onChange={event => updateCell(cell.id, { content: textDocument(event.target.value) })} /></td>;
        })}</tr>)}</tbody></table></div>
        {selectedCell && <ColorField label="Selected cell fill" value={selectedCell.fill.type === 'solid' ? selectedCell.fill.color : '#ffffff'} onChange={color => updateCell(selectedCell.id, { fill: { type: 'solid', color } })} />}
        <div className="dialog-actions"><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button onClick={() => { onChange(draft); setDraft(null); }}>Save table</Button></div>
      </>}
    </DialogContent></Dialog>
  </>;
}

function ChartDataEditor({ chart, onChange }: { chart: ChartElement; onChange: (value: Pick<ChartElement, 'categories' | 'series'>) => void }) {
  const [draft, setDraft] = useState<{ categories: string[]; series: { id: string; name: string; color: string; values: string[] }[] } | null>(null);
  const valid = draft?.series.every(series => series.values.every(value => value.trim() !== '' && Number.isFinite(Number(value)))) ?? false;
  return <>
    <p className="property-note">{chart.categories.length} categories · {chart.series.length} series</p>
    <Button variant="outline" size="sm" disabled={chart.locked} onClick={() => setDraft({ categories: [...chart.categories], series: chart.series.map(series => ({ ...series, values: chart.categories.map((_, index) => String(series.values[index] ?? 0)) })) })}>Edit chart data</Button>
    <Dialog open={draft !== null} onOpenChange={open => { if (!open) setDraft(null); }}><DialogContent className="data-dialog"><DialogHeader><DialogTitle>Chart data</DialogTitle><DialogDescription>Edit categories and series in the spreadsheet. Each value must be a finite number; changes apply when you save.</DialogDescription></DialogHeader>
      {draft && <>
        <div className="data-dialog-tools"><Button variant="outline" size="sm" onClick={() => setDraft({ categories: [...draft.categories, `Category ${draft.categories.length + 1}`], series: draft.series.map(series => ({ ...series, values: [...series.values, '0'] })) })}><Plus size={12} />Category</Button><Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, series: [...draft.series, { id: nanoid(), name: `Series ${draft.series.length + 1}`, color: '#ed7355', values: draft.categories.map(() => '0') }] })}><Plus size={12} />Series</Button></div>
        <div className="data-sheet-scroll"><table className="data-sheet"><thead><tr><th scope="col">Category</th>{draft.series.map(series => <th key={series.id} scope="col"><Input aria-label="Series name" value={series.name} onChange={event => setDraft({ ...draft, series: draft.series.map(item => item.id === series.id ? { ...item, name: event.target.value } : item) })} /><div className="data-series-tools"><input type="color" aria-label={`${series.name} color`} value={series.color} onChange={event => setDraft({ ...draft, series: draft.series.map(item => item.id === series.id ? { ...item, color: event.target.value } : item) })} /><Button variant="ghost" size="icon-sm" aria-label={`Remove series ${series.name}`} disabled={draft.series.length <= 1} onClick={() => setDraft({ ...draft, series: draft.series.filter(item => item.id !== series.id) })}><Trash2 size={12} /></Button></div></th>)}<th /></tr></thead><tbody>{draft.categories.map((category, row) => <tr key={row}><th scope="row"><Input aria-label={`Category ${row + 1}`} value={category} onChange={event => setDraft({ ...draft, categories: draft.categories.map((item, index) => index === row ? event.target.value : item) })} /></th>{draft.series.map(series => <td key={series.id}><Input aria-label={`${series.name} value ${row + 1}`} inputMode="decimal" value={series.values[row] ?? ''} aria-invalid={!series.values[row]?.trim() || !Number.isFinite(Number(series.values[row]))} onChange={event => setDraft({ ...draft, series: draft.series.map(item => item.id === series.id ? { ...item, values: item.values.map((value, index) => index === row ? event.target.value : value) } : item) })} /></td>)}<td><Button variant="ghost" size="icon-sm" aria-label={`Remove category ${row + 1}`} disabled={draft.categories.length <= 1} onClick={() => setDraft({ categories: draft.categories.filter((_, index) => index !== row), series: draft.series.map(series => ({ ...series, values: series.values.filter((_, index) => index !== row) })) })}><Trash2 size={12} /></Button></td></tr>)}</tbody></table></div>
        {!valid && <p className="data-error" role="alert">Enter a number in every value cell before saving.</p>}
        <div className="dialog-actions"><Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button><Button disabled={!valid} onClick={() => { onChange({ categories: draft.categories, series: draft.series.map(series => ({ ...series, values: series.values.map(Number) })) }); setDraft(null); }}>Save chart data</Button></div>
      </>}
    </DialogContent></Dialog>
  </>;
}

export function PropertiesPanel() {
  const editor = useEditor();
  const [tab, setTab] = useState('slide');
  const slide = editor.document.slides.find(item => item.id === editor.activeSlideId);
  const selected = slide?.elements.filter(element => editor.selection.includes(element.id)) ?? [];
  const element = selected[0];
  useEffect(() => { setTab(previous => previous === 'layers' ? previous : element ? 'style' : 'slide'); }, [element?.id]);
  if (!slide) return null;
  const set = (patch: Partial<SlideElement>) => { if (element) editor.updateElement(element.id, patch); };
  const setGeometry = (key: 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity', value: number) => editor.mutate('Transform elements', draft => {
    draft.slides.find(item => item.id === slide.id)?.elements.forEach(item => { if (editor.selection.includes(item.id) && !item.locked) item[key] = value; });
  });
  const setBackground = (background: Background) => editor.mutate('Change slide background', draft => { const target = draft.slides.find(item => item.id === slide.id); if (target) target.background = background; });
  return <aside className="properties-panel" aria-label="Design properties">
    <div className="panel-header"><h2>Design</h2><SlidersHorizontal size={16} className="panel-muted" /></div>
    <Tabs value={tab} onValueChange={value => setTab(String(value))} className="properties-tabs"><TabsList variant="line" className="properties-tab-list"><TabsTrigger value="slide">Slide</TabsTrigger><TabsTrigger value="style">Style</TabsTrigger><TabsTrigger value="layers">Layers</TabsTrigger></TabsList>
      <div className="properties-scroll"><TabsContent value="slide">
        <Section title="Background"><div className="background-palette">{palette.map(color => <button type="button" key={color.name} title={color.name} aria-label={`${color.name} background`} aria-pressed={slide.background.type === 'solid' && slide.background.color === color.color} className={slide.background.type === 'solid' && slide.background.color === color.color ? 'selected' : ''} style={{ backgroundColor: color.color }} onClick={() => setBackground({ type: 'solid', color: color.color })} />)}</div><FillControl value={slide.background} allowNone={false} onChange={value => { if (value.type !== 'none') setBackground(value); }} /></Section>
        <Section title="Layout"><div className="property-layout-grid">{layouts.map(layout => <button key={layout.id} className={`property-layout ${slide.layoutId === layout.id ? 'selected' : ''}`} title={layout.name} onClick={() => editor.mutate('Change slide layout', draft => { const target = draft.slides.find(item => item.id === slide.id); if (target) { const next = createSlide(layout.id); target.elements = next.elements; target.layoutId = layout.id; } })}><div className="property-layout-preview"><SlideRenderer slide={createSlide(layout.id)} theme={editor.document.theme} width={1920} /></div><span>{layout.name}</span></button>)}</div></Section>
        <Section title="Transition"><Choice label="Effect" value={slide.transition.effect} options={[{ value: 'none', label: 'None' }, { value: 'fade', label: 'Fade' }, { value: 'slideLeft', label: 'Slide left' }, { value: 'slideRight', label: 'Slide right' }, { value: 'push', label: 'Push' }, { value: 'zoom', label: 'Zoom' }, { value: 'flip', label: 'Flip' }, { value: 'cube', label: 'Cube' }]} onChange={effect => editor.mutate('Change transition', draft => { const target = draft.slides.find(item => item.id === slide.id); if (target) target.transition.effect = effect; })} /><NumberField label="Duration (seconds)" min={0} step={.1} value={slide.transition.duration} onChange={duration => editor.mutate('Change transition duration', draft => { const target = draft.slides.find(item => item.id === slide.id); if (target) target.transition.duration = duration; })} /></Section>
        <Section title="Slide size"><div className="slide-size-card"><Maximize size={18} /><div><strong>{editor.document.slideSize.width / editor.document.slideSize.height === 16 / 9 ? 'Widescreen · 16:9' : 'Custom size'}</strong><span>{editor.document.slideSize.width} × {editor.document.slideSize.height} px</span></div></div><div className="property-grid"><NumberField label="Width" min={320} value={editor.document.slideSize.width} onChange={width => editor.mutate('Resize presentation', draft => { draft.slideSize.width = width; })} /><NumberField label="Height" min={180} value={editor.document.slideSize.height} onChange={height => editor.mutate('Resize presentation', draft => { draft.slideSize.height = height; })} /></div></Section>
      </TabsContent>
      <TabsContent value="style">{element ? <>
        <Section title={selected.length > 1 ? `${selected.length} elements selected` : `${element.type.charAt(0).toUpperCase()}${element.type.slice(1)} properties`}><label className="property-field"><span>Name</span><Input value={element.name} onChange={event => set({ name: event.target.value })} /></label><div className="property-grid">{(['x', 'y', 'width', 'height', 'rotation'] as const).map(key => <NumberField key={key} label={key === 'rotation' ? 'Rotation °' : key === 'width' ? 'W' : key === 'height' ? 'H' : key.toUpperCase()} value={element[key]} {...(key === 'width' || key === 'height' ? { min: 1 } : {})} onChange={value => setGeometry(key, value)} />)}<NumberField label="Opacity %" value={element.opacity * 100} min={0} max={100} onChange={value => setGeometry('opacity', value / 100)} /></div><div className="property-button-row"><Toggle label="Locked" value={element.locked} onChange={locked => set({ locked })} /><Toggle label="Hidden" value={element.hidden} onChange={hidden => set({ hidden })} /></div></Section>
        {'fill' in element && <Section title="Fill"><FillControl value={element.fill} onChange={fill => set({ fill })} /></Section>}
        {element.type === 'text' && <><Section title="Typography"><label className="property-field"><span>Text</span><Textarea value={plainText(element.content)} onChange={event => set({ content: textDocument(event.target.value) })} /></label><Choice label="Font" value={element.fontFamily} options={['Geist', 'Inter', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana']} onChange={fontFamily => set({ fontFamily })} /><div className="property-grid"><NumberField label="Font size" min={1} value={element.fontSize} onChange={fontSize => set({ fontSize })} /><NumberField label="Letter spacing" value={element.letterSpacing} step={.1} onChange={letterSpacing => set({ letterSpacing })} /></div><ColorField label="Text color" value={element.color} onChange={color => set({ color })} /><div className="property-button-row"><Toggle label="Bold" value={element.bold} onChange={bold => set({ bold })} /><Toggle label="Italic" value={element.italic} onChange={italic => set({ italic })} /></div><Choice label="Alignment" value={element.align} options={['left', 'center', 'right']} onChange={align => set({ align })} /><Choice label="Vertical alignment" value={element.verticalAlign} options={['top', 'middle', 'bottom']} onChange={verticalAlign => set({ verticalAlign })} /><Choice label="Auto fit" value={element.autoFit} options={['none', 'shrink', 'resize-shape']} onChange={autoFit => set({ autoFit })} /><NumberField label="Padding" value={element.padding} min={0} onChange={padding => set({ padding })} /></Section></>}
        {element.type === 'shape' && <Section title="Shape"><Choice label="Shape" value={element.shape} options={shapeKinds} onChange={shape => set({ shape })} /><div className="property-button-row"><Toggle label="Flip horizontal" value={element.flipH} onChange={flipH => set({ flipH })} /><Toggle label="Flip vertical" value={element.flipV} onChange={flipV => set({ flipV })} /></div><label className="property-field"><span>Shape text</span><Textarea value={element.text ? plainText(element.text) : ''} onChange={event => set({ text: event.target.value ? textDocument(event.target.value) : null })} /></label><Choice label="Text position" value={element.textVerticalAlign} options={['top', 'middle', 'bottom']} onChange={textVerticalAlign => set({ textVerticalAlign })} /></Section>}
        {element.type === 'line' && <Section title="Line"><Choice label="Path" value={element.curve} options={['straight', 'elbow', 'curved']} onChange={curve => set({ curve })} />{(['start', 'end'] as const).map(point => <div className="property-grid" key={point}>{(['x', 'y'] as const).map(axis => <NumberField key={axis} label={`${point} ${axis}`} value={element[point][axis]} onChange={value => set({ [point]: { ...element[point], [axis]: value } })} />)}</div>)}<Choice label="Start arrow" value={element.startArrow} options={['none', 'arrow', 'triangle', 'circle', 'diamond', 'bar']} onChange={startArrow => set({ startArrow })} /><Choice label="End arrow" value={element.endArrow} options={['none', 'arrow', 'triangle', 'circle', 'diamond', 'bar']} onChange={endArrow => set({ endArrow })} /></Section>}
        {element.type === 'image' && <><Section title="Image"><label className="property-field"><span>Image URL</span><Input value={element.assetId.startsWith('data:') ? '' : element.assetId} placeholder={element.assetId.startsWith('data:') ? 'Uploaded image' : 'https://…'} onChange={event => set({ assetId: event.target.value })} /></label><span className="property-note">Original: {element.naturalWidth} × {element.naturalHeight} px</span><Choice label="Mask" value={element.clipShape} options={['none', 'ellipse', 'roundRect']} onChange={clipShape => set({ clipShape })} /><div className="property-button-row"><Toggle label="Flip horizontal" value={element.flipH} onChange={flipH => set({ flipH })} /><Toggle label="Flip vertical" value={element.flipV} onChange={flipV => set({ flipV })} /></div></Section><Section title="Crop"><div className="property-grid">{(['x', 'y', 'width', 'height'] as const).map(key => <NumberField key={key} label={key} value={element.crop[key]} min={0} max={1} step={.01} onChange={value => set({ crop: { ...element.crop, [key]: value } })} />)}</div></Section><Section title="Image adjustments">{(['brightness', 'contrast', 'saturation', 'blur', 'grayscale'] as const).map(key => <NumberField key={key} label={key} value={element.filters[key]} min={0} {...(key === 'grayscale' ? { max: 1 } : {})} step={key === 'blur' ? 1 : .1} onChange={value => set({ filters: { ...element.filters, [key]: value } })} />)}</Section></>}
        {element.type === 'table' && <><Section title="Table style"><div className="property-button-row"><Toggle label="Header row" value={element.style.headerRow} onChange={headerRow => set({ style: { ...element.style, headerRow } })} /><Toggle label="Banded rows" value={element.style.bandedRows} onChange={bandedRows => set({ style: { ...element.style, bandedRows } })} /></div><ColorField label="Border color" value={element.style.borderColor} onChange={borderColor => set({ style: { ...element.style, borderColor } })} /><NumberField label="Border width" value={element.style.borderWidth} min={0} onChange={borderWidth => set({ style: { ...element.style, borderWidth } })} /><FillControl value={element.style.headerFill} onChange={headerFill => set({ style: { ...element.style, headerFill } })} /></Section><Section title="Table data"><TableDataEditor key={element.id} table={element} onChange={value => set({ rows: value.rows, columnWidths: value.columnWidths })} /></Section></>}
        {element.type === 'chart' && <><Section title="Chart"><Choice label="Type" value={element.chart} options={['bar', 'barHorizontal', 'line', 'area', 'pie', 'donut', 'scatter']} onChange={chart => set({ chart })} /><label className="property-field"><span>Title</span><Input value={element.options.title} onChange={event => set({ options: { ...element.options, title: event.target.value } })} /></label><div className="property-button-row">{(['showLegend', 'showGrid', 'showValues', 'stacked'] as const).map(key => <Toggle key={key} label={key.replace('show', '')} value={element.options[key]} onChange={value => set({ options: { ...element.options, [key]: value } })} />)}</div></Section><Section title="Chart data"><ChartDataEditor key={element.id} chart={element} onChange={set} /></Section></>}
        {'stroke' in element && <Section title="Outline"><StrokeControl value={element.stroke} required={element.type === 'line'} onChange={stroke => { if (element.type !== 'line' || stroke) set({ stroke }); }} /></Section>}
        {'cornerRadius' in element && <Section title="Corners"><NumberField label="Radius" min={0} value={element.cornerRadius} onChange={cornerRadius => set({ cornerRadius })} /></Section>}
        {'shadow' in element && <Section title="Shadow"><ShadowControl value={element.shadow} onChange={shadow => set({ shadow })} /></Section>}
        <Section title="Link"><Choice label="Link to" value={element.link?.kind ?? 'none'} options={['none', 'url', 'slide']} onChange={kind => {
          if (kind === 'none') editor.mutate('Remove link', draft => { const target = draft.slides.find(item => item.id === slide.id)?.elements.find(item => item.id === element.id); if (target) delete target.link; });
          else set({ link: kind === 'url' ? { kind, href: 'https://' } : { kind, slideId: slide.id } });
        }} />{element.link?.kind === 'url' && <Input aria-label="Link URL" value={element.link.href} onChange={event => set({ link: { kind: 'url', href: event.target.value } })} />}{element.link?.kind === 'slide' && <Choice label="Destination" value={element.link.slideId} options={editor.document.slides.map((item, index) => ({ value: item.id, label: `Slide ${index + 1}` }))} onChange={slideId => set({ link: { kind: 'slide', slideId } })} />}</Section>
        <Section title="Animations">{element.animations.map(animation => <div className="animation-editor" key={animation.id}><Choice label="Category" value={animation.category} options={['entrance', 'emphasis', 'exit']} onChange={category => set({ animations: element.animations.map(item => item.id === animation.id ? { ...item, category } : item) })} /><Choice label="Effect" value={animation.effect} options={effects} onChange={effect => set({ animations: element.animations.map(item => item.id === animation.id ? { ...item, effect } : item) })} /><Choice label="Trigger" value={animation.trigger} options={['onClick', 'withPrevious', 'afterPrevious']} onChange={trigger => set({ animations: element.animations.map(item => item.id === animation.id ? { ...item, trigger } : item) })} /><div className="property-grid">{(['duration', 'delay'] as const).map(key => <NumberField key={key} label={`${key} (s)`} min={0} step={.1} value={animation[key]} onChange={value => set({ animations: element.animations.map(item => item.id === animation.id ? { ...item, [key]: value } : item) })} />)}</div><Button size="sm" variant="destructive" onClick={() => set({ animations: element.animations.filter(item => item.id !== animation.id) })}>Remove animation</Button></div>)}<Button size="sm" variant="outline" onClick={() => set({ animations: [...element.animations, { id: nanoid(), category: 'entrance', effect: 'fadeIn', trigger: 'onClick', duration: .5, delay: 0 }] })}><Plus size={12} />Add animation</Button></Section>
      </> : <div className="properties-empty"><SlidersHorizontal size={26} /><strong>Make it your own</strong><span>Select an element to edit its position, color, and style.</span></div>}</TabsContent>
      <TabsContent value="layers"><LayersPanel slide={slide} /></TabsContent>
      </div>
    </Tabs>
    <div className="design-footer"><span className="design-status-dot" />Every detail, considered.</div>
  </aside>;
}
