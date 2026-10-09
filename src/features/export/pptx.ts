import { notesText } from '@/features/text/notes';
import pptxgen from 'pptxgenjs';
import type { Fill, Presentation, ShapeKind, Stroke, TipTapDocument } from '@/types/model';
import { plainText } from '@/types/model';
import { unitsToInches as inch, unitsToPoints as pt } from '@/lib/units';
import { blobDataUrl, fetchAsset, filename } from './assets';

const shapes: Record<ShapeKind, pptxgen.SHAPE_NAME> = {
  rect: 'rect', roundRect: 'roundRect', ellipse: 'ellipse', triangle: 'triangle', rightTriangle: 'rtTriangle',
  diamond: 'diamond', pentagon: 'pentagon', hexagon: 'hexagon', octagon: 'octagon', star5: 'star5', star6: 'star6',
  arrowRight: 'rightArrow', arrowLeft: 'leftArrow', arrowUp: 'upArrow', arrowDown: 'downArrow', arrowDouble: 'leftRightArrow',
  chevron: 'chevron', parallelogram: 'parallelogram', trapezoid: 'trapezoid', plus: 'mathPlus', heart: 'heart', cloud: 'cloud',
  calloutRect: 'wedgeRectCallout', calloutEllipse: 'wedgeEllipseCallout',
};
function hex(color: string): string {
  const value = color.replace('#', '');
  if (/^[a-f\d]{3}$/i.test(value)) return value.replace(/./g, character => character.repeat(2));
  return /^[a-f\d]{6}/i.test(value) ? value.slice(0, 6) : '000000';
}
function fillOptions(fill: Fill, opacity = 1): pptxgen.ShapeFillProps {
  if (fill.type === 'none' || fill.type === 'image') return { color: 'FFFFFF', transparency: 100 };
  return { color: hex(fill.type === 'solid' ? fill.color : fill.gradient.stops[0]?.color ?? '#ffffff'), transparency: (1 - opacity) * 100 };
}
function lineOptions(stroke: Stroke | null, opacity = 1): pptxgen.ShapeLineProps {
  return stroke ? { color: hex(stroke.color), width: pt(stroke.width), transparency: (1 - opacity) * 100,
    dashType: stroke.style === 'dashed' ? 'dash' : stroke.style === 'dotted' ? 'sysDot' : 'solid' } : { transparency: 100 };
}
function richRuns(node: TipTapDocument, inherited: pptxgen.TextPropsOptions = {}): pptxgen.TextProps[] {
  const options = { ...inherited };
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') options.bold = true;
    if (mark.type === 'italic') options.italic = true;
    if (mark.type === 'underline') options.underline = { style: 'sng' };
    if (mark.type === 'strike') options.strike = true;
    if (mark.type === 'link' && typeof mark.attrs?.href === 'string' && /^(https?:|mailto:|tel:)/i.test(mark.attrs.href)) options.hyperlink = { url: mark.attrs.href };
    if (mark.type === 'textStyle') {
      if (typeof mark.attrs?.color === 'string') options.color = hex(mark.attrs.color);
      if (typeof mark.attrs?.fontFamily === 'string') options.fontFace = mark.attrs.fontFamily;
      if (typeof mark.attrs?.fontSize === 'string') { const size = Number.parseFloat(mark.attrs.fontSize); if (Number.isFinite(size)) options.fontSize = pt(size); }
    }
  }
  if (node.text) return [{ text: node.text, options }];
  if (node.type === 'hardBreak') return [{ text: '\n', options }];
  const children = node.content ?? [];
  return children.flatMap((child, index) => {
    const runs = richRuns(child, options);
    if (node.type === 'doc' && index < children.length - 1) runs.push({ text: '\n', options });
    return runs;
  });
}
export async function exportPptx(presentation: Presentation): Promise<void> {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'FOLIO', width: inch(presentation.slideSize.width), height: inch(presentation.slideSize.height) });
  pptx.layout = 'FOLIO'; pptx.title = presentation.title; pptx.author = 'Folio';
  pptx.theme = { headFontFace: presentation.theme.fonts.heading, bodyFontFace: presentation.theme.fonts.body };
  const imageCache: Record<string, string> = {};
  const imageData = async (asset: string) => imageCache[asset] ?? (imageCache[asset] = await blobDataUrl(await fetchAsset(asset)));
  for (const source of presentation.slides) {
    const slide = pptx.addSlide();
    slide.hidden = source.skipped ?? false;
    slide.addNotes(notesText(source.notes));
    if (source.background.type === 'image') slide.addImage({ data: await imageData(source.background.assetId), x: 0, y: 0, w: inch(presentation.slideSize.width), h: inch(presentation.slideSize.height) });
    else slide.background = { color: hex(source.background.type === 'solid' ? source.background.color : source.background.gradient.stops[0]?.color ?? '#ffffff') };
    for (const element of source.elements) {
      if (element.hidden) continue;
      const box = { x: inch(element.x), y: inch(element.y), w: inch(element.width), h: inch(element.height), rotate: element.rotation, objectName: element.name };
      const slideLinkId = element.link?.kind === 'slide' ? element.link.slideId : undefined;
      const link: pptxgen.HyperlinkProps | undefined = element.link?.kind === 'url'
        ? (/^(https?:|mailto:|tel:)/i.test(element.link.href) ? { url: element.link.href } : undefined)
        : slideLinkId ? { slide: presentation.slides.findIndex(item => item.id === slideLinkId) + 1 } : undefined;
      const hyperlink = link ? { hyperlink: link } : {};
      if ('fill' in element && element.fill.type === 'image') slide.addImage({ ...box, data: await imageData(element.fill.assetId), transparency: (1 - element.opacity) * 100 });
      switch (element.type) {
        case 'text': slide.addText(richRuns(element.content), { ...box, fontSize: pt(element.fontSize), fontFace: element.fontFamily,
          color: hex(element.color), bold: element.bold, italic: element.italic, align: element.align,
          valign: element.verticalAlign, margin: pt(element.padding),
          charSpacing: pt(element.letterSpacing), fill: fillOptions(element.fill, element.opacity), line: lineOptions(element.stroke, element.opacity),
          transparency: (1 - element.opacity) * 100, breakLine: false, ...hyperlink,
          fit: element.autoFit === 'shrink' ? 'shrink' : element.autoFit === 'resize-shape' ? 'resize' : 'none' }); break;
        case 'shape':
          slide.addShape(shapes[element.shape], { ...box, fill: fillOptions(element.fill, element.opacity), line: lineOptions(element.stroke, element.opacity),
            flipH: element.flipH, flipV: element.flipV, rectRadius: element.cornerRadius / Math.max(1, element.width), ...hyperlink });
          if (element.text) slide.addText(richRuns(element.text), { ...box, fontFace: presentation.theme.fonts.body, fontSize: pt(32), margin: pt(12),
            color: hex(presentation.theme.colors.text), align: 'center', valign: element.textVerticalAlign });
          break;
        case 'line': {
          const arrow = (value: typeof element.startArrow): NonNullable<pptxgen.ShapeLineProps['beginArrowType']> => value === 'circle' ? 'oval' : value === 'bar' ? 'none' : value;
          slide.addShape('line', { ...box, x: inch(element.x + Math.min(element.start.x, element.end.x)), y: inch(element.y + Math.min(element.start.y, element.end.y)),
            w: inch(Math.abs(element.end.x - element.start.x)), h: inch(Math.abs(element.end.y - element.start.y)),
            flipH: element.end.x < element.start.x, flipV: element.end.y < element.start.y,
            line: { ...lineOptions(element.stroke, element.opacity), beginArrowType: arrow(element.startArrow), endArrowType: arrow(element.endArrow) } }); break;
        }
        case 'image': slide.addImage({ ...box, data: await imageData(element.assetId), flipH: element.flipH, flipV: element.flipV,
          transparency: (1 - element.opacity) * 100, ...hyperlink }); break;
        case 'table': {
          const rows: pptxgen.TableRow[] = element.rows.map((row, index) => row.cells.map(cell => ({ text: plainText(cell.content),
            options: { colspan: cell.colSpan, rowspan: cell.rowSpan, fill: fillOptions(index === 0 && element.style.headerRow ? element.style.headerFill : cell.fill),
              bold: index === 0 && element.style.headerRow } })));
          slide.addTable(rows, { ...box, colW: element.columnWidths.map(inch), rowH: element.rows.map(row => inch(row.height)),
            fontFace: presentation.theme.fonts.body, fontSize: pt(28), color: hex(presentation.theme.colors.text), margin: pt(12),
            border: { color: hex(element.style.borderColor), pt: pt(element.style.borderWidth) }, autoPage: false }); break;
        }
        case 'chart': {
          const chartKinds: Record<typeof element.chart, pptxgen.CHART_NAME> = { bar: 'bar', barHorizontal: 'bar', line: 'line', area: 'area', pie: 'pie', donut: 'doughnut', scatter: 'scatter' };
          slide.addChart(chartKinds[element.chart], element.series.map(series => ({ name: series.name, labels: element.categories, values: series.values })),
            { ...box, chartColors: element.series.map(series => hex(series.color)), showLegend: element.options.showLegend,
              showValue: element.options.showValues, showTitle: !!element.options.title, title: element.options.title,
              barDir: element.chart === 'barHorizontal' ? 'bar' : 'col', barGrouping: element.options.stacked ? 'stacked' : 'clustered',
              valGridLine: { color: 'E4E4E7', size: 1, style: element.options.showGrid ? 'solid' : 'none' },
              showLabel: element.chart === 'pie' || element.chart === 'donut' }); break;
        }
      }
    }
  }
  await pptx.writeFile({ fileName: `${filename(presentation.title)}.pptx`, compression: true });
}
