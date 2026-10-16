import { notesText } from '@/features/text/notes';
import pptxgen from 'pptxgenjs';
import type { Fill, Presentation, ShapeKind, Stroke, TipTapDocument } from '@/types/model';
import { plainText } from '@/types/model';
import { unitsToInches as inch, unitsToPoints as pt } from '@/lib/units';
import { blobDataUrl, fetchAsset, filename } from './assets';
import { strings } from "@/strings";
import { isString } from "@/lib/typeGuards";


const shapes: Record<ShapeKind, pptxgen.SHAPE_NAME> = {
  rect: strings.common.rect, roundRect: strings.common.roundRect, ellipse: strings.common.ellipse, triangle: strings.common.triangle, rightTriangle: strings.export.rtTriangle,
  diamond: strings.common.diamond, pentagon: strings.common.pentagon, hexagon: strings.common.hexagon, octagon: strings.common.octagon, star5: strings.common.star5, star6: strings.common.star6,
  arrowRight: strings.export.rightArrow, arrowLeft: strings.export.leftArrow, arrowUp: strings.export.upArrow, arrowDown: strings.export.downArrow, arrowDouble: strings.export.leftRightArrow,
  chevron: strings.common.chevron, parallelogram: strings.common.parallelogram, trapezoid: strings.common.trapezoid, plus: strings.export.mathPlus, heart: strings.common.heart, cloud: strings.common.cloud,
  calloutRect: strings.export.wedgeRectCallout, calloutEllipse: strings.export.wedgeEllipseCallout,
};
function hex(color: string): string {
  const value = color.replace(strings.export.symbol_334359b9, strings.common.empty);
  if (/^[a-f\d]{3}$/i.test(value)) return value.replace(/./g, character => character.repeat(2));
  return /^[a-f\d]{6}/i.test(value) ? value.slice(0, 6) : strings.export.value000000;
}
function fillOptions(fill: Fill, opacity = 1): pptxgen.ShapeFillProps {
  if (fill.type === strings.common.none || fill.type === strings.common.image) return { color: strings.export.fFFFFF, transparency: 100 };
  return { color: hex(fill.type === strings.common.solid ? fill.color : fill.gradient.stops[0]?.color ?? strings.common.colorffffff), transparency: (1 - opacity) * 100 };
}
function lineOptions(stroke: Stroke | null, opacity = 1): pptxgen.ShapeLineProps {
  return stroke ? { color: hex(stroke.color), width: pt(stroke.width), transparency: (1 - opacity) * 100,
    dashType: stroke.style === strings.common.dashed ? strings.export.dash : stroke.style === strings.common.dotted ? strings.export.sysDot : strings.common.solid } : { transparency: 100 };
}
function richRuns(node: TipTapDocument, inherited: pptxgen.TextPropsOptions = {}): pptxgen.TextProps[] {
  const options = { ...inherited };
  for (const mark of node.marks ?? []) {
    if (mark.type === strings.common.bold) options.bold = true;
    if (mark.type === strings.common.italic) options.italic = true;
    if (mark.type === strings.common.underline) options.underline = { style: strings.export.sng };
    if (mark.type === strings.common.strike) options.strike = true;
    if (mark.type === strings.common.link && isString(mark.attrs?.href) && /^(https?:|mailto:|tel:)/i.test(mark.attrs.href)) options.hyperlink = { url: mark.attrs.href };
    if (mark.type === strings.common.textStyle) {
      if (isString(mark.attrs?.color)) options.color = hex(mark.attrs.color);
      if (isString(mark.attrs?.fontFamily)) options.fontFace = mark.attrs.fontFamily;
      if (isString(mark.attrs?.fontSize)) { const size = Number.parseFloat(mark.attrs.fontSize); if (Number.isFinite(size)) options.fontSize = pt(size); }
    }
  }
  if (node.text) return [{ text: node.text, options }];
  if (node.type === strings.common.hardBreak) return [{ text: strings.common.newline, options }];
  const children = node.content ?? [];
  return children.flatMap((child, index) => {
    const runs = richRuns(child, options);
    if (node.type === strings.common.doc && index < children.length - 1) runs.push({ text: strings.common.newline, options });
    return runs;
  });
}
export async function exportPptx(presentation: Presentation): Promise<void> {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: strings.export.fOLIO, width: inch(presentation.slideSize.width), height: inch(presentation.slideSize.height) });
  pptx.layout = strings.export.fOLIO; pptx.title = presentation.title; pptx.author = strings.export.appName;
  pptx.theme = { headFontFace: presentation.theme.fonts.heading, bodyFontFace: presentation.theme.fonts.body };
  const imageCache: Record<string, string> = {};
  const imageData = async (asset: string) => imageCache[asset] ?? (imageCache[asset] = await blobDataUrl(await fetchAsset(asset)));
  for (const source of presentation.slides) {
    const slide = pptx.addSlide();
    slide.hidden = source.skipped ?? false;
    slide.addNotes(notesText(source.notes));
    if (source.background.type === strings.common.image) slide.addImage({ data: await imageData(source.background.assetId), x: 0, y: 0, w: inch(presentation.slideSize.width), h: inch(presentation.slideSize.height) });
    else slide.background = { color: hex(source.background.type === strings.common.solid ? source.background.color : source.background.gradient.stops[0]?.color ?? strings.common.colorffffff) };
    for (const element of source.elements) {
      if (element.hidden) continue;
      const box = { x: inch(element.x), y: inch(element.y), w: inch(element.width), h: inch(element.height), rotate: element.rotation, objectName: element.name };
      const slideLinkId = element.link?.kind === strings.common.slide ? element.link.slideId : undefined;
      const link: pptxgen.HyperlinkProps | undefined = element.link?.kind === strings.common.url
        ? (/^(https?:|mailto:|tel:)/i.test(element.link.href) ? { url: element.link.href } : undefined)
        : slideLinkId ? { slide: presentation.slides.findIndex(item => item.id === slideLinkId) + 1 } : undefined;
      const hyperlink = link ? { hyperlink: link } : {};
      if (strings.common.fill in element && element.fill.type === strings.common.image) slide.addImage({ ...box, data: await imageData(element.fill.assetId), transparency: (1 - element.opacity) * 100 });
      switch (element.type) {
        case strings.common.text: slide.addText(richRuns(element.content), { ...box, fontSize: pt(element.fontSize), fontFace: element.fontFamily,
          color: hex(element.color), bold: element.bold, italic: element.italic, align: element.align,
          valign: element.verticalAlign, margin: pt(element.padding),
          charSpacing: pt(element.letterSpacing), fill: fillOptions(element.fill, element.opacity), line: lineOptions(element.stroke, element.opacity),
          transparency: (1 - element.opacity) * 100, breakLine: false, ...hyperlink,
          fit: element.autoFit === strings.common.shrink ? strings.common.shrink : element.autoFit === strings.common.resizeShape ? strings.common.resize : strings.common.none }); break;
        case strings.common.shape:
          slide.addShape(shapes[element.shape], { ...box, fill: fillOptions(element.fill, element.opacity), line: lineOptions(element.stroke, element.opacity),
            flipH: element.flipH, flipV: element.flipV, rectRadius: element.cornerRadius / Math.max(1, element.width), ...hyperlink });
          if (element.text) slide.addText(richRuns(element.text), { ...box, fontFace: presentation.theme.fonts.body, fontSize: pt(32), margin: pt(12),
            color: hex(presentation.theme.colors.text), align: strings.common.center, valign: element.textVerticalAlign });
          break;
        case strings.common.line: {
          const arrow = (value: typeof element.startArrow): NonNullable<pptxgen.ShapeLineProps['beginArrowType']> => value === strings.common.circle ? strings.export.oval : value === strings.common.bar ? strings.common.none : value;
          slide.addShape(strings.common.line, { ...box, x: inch(element.x + Math.min(element.start.x, element.end.x)), y: inch(element.y + Math.min(element.start.y, element.end.y)),
            w: inch(Math.abs(element.end.x - element.start.x)), h: inch(Math.abs(element.end.y - element.start.y)),
            flipH: element.end.x < element.start.x, flipV: element.end.y < element.start.y,
            line: { ...lineOptions(element.stroke, element.opacity), beginArrowType: arrow(element.startArrow), endArrowType: arrow(element.endArrow) } }); break;
        }
        case strings.common.image: slide.addImage({ ...box, data: await imageData(element.assetId), flipH: element.flipH, flipV: element.flipV,
          transparency: (1 - element.opacity) * 100, ...hyperlink }); break;
        case strings.common.table: {
          const rows: pptxgen.TableRow[] = element.rows.map((row, index) => row.cells.map(cell => ({ text: plainText(cell.content),
            options: { colspan: cell.colSpan, rowspan: cell.rowSpan, fill: fillOptions(index === 0 && element.style.headerRow ? element.style.headerFill : cell.fill),
              bold: index === 0 && element.style.headerRow } })));
          slide.addTable(rows, { ...box, colW: element.columnWidths.map(inch), rowH: element.rows.map(row => inch(row.height)),
            fontFace: presentation.theme.fonts.body, fontSize: pt(28), color: hex(presentation.theme.colors.text), margin: pt(12),
            border: { color: hex(element.style.borderColor), pt: pt(element.style.borderWidth) }, autoPage: false }); break;
        }
        case strings.common.chart: {
          const chartKinds: Record<typeof element.chart, pptxgen.CHART_NAME> = { bar: strings.common.bar, barHorizontal: strings.common.bar, line: strings.common.line, area: strings.common.area, pie: strings.common.pie, donut: strings.export.doughnut, scatter: strings.common.scatter };
          slide.addChart(chartKinds[element.chart], element.series.map(series => ({ name: series.name, labels: element.categories, values: series.values })),
            { ...box, chartColors: element.series.map(series => hex(series.color)), showLegend: element.options.showLegend,
              showValue: element.options.showValues, showTitle: !!element.options.title, title: element.options.title,
              barDir: element.chart === strings.common.barHorizontal ? strings.common.bar : strings.common.col, barGrouping: element.options.stacked ? strings.common.stacked : strings.export.clustered,
              valGridLine: { color: strings.export.e4E4E7, size: 1, style: element.options.showGrid ? strings.common.solid : strings.common.none },
              showLabel: element.chart === strings.common.pie || element.chart === strings.common.donut }); break;
        }
      }
    }
  }
  await pptx.writeFile({ fileName: `${filename(presentation.title)}${strings.export.pptx}`, compression: true });
}
