import JSZip from 'jszip';
import { nanoid } from 'nanoid';
import { createElement, createPresentation, createSlide } from '@/lib/defaults';
import { textDocument } from '@/types/model';
import type { ChartKind, Fill, Presentation, ShapeKind, SlideElement } from '@/types/model';
import { blobDataUrl } from './assets';
import { strings } from "@/strings";


const shapeKinds: Record<string, ShapeKind> = { rect: strings.common.rect, roundRect: strings.common.roundRect, ellipse: strings.common.ellipse, triangle: strings.common.triangle, rtTriangle: strings.common.rightTriangle,
  diamond: strings.common.diamond, pentagon: strings.common.pentagon, hexagon: strings.common.hexagon, octagon: strings.common.octagon, star5: strings.common.star5, star6: strings.common.star6, rightArrow: strings.common.arrowRight, leftArrow: strings.common.arrowLeft,
  upArrow: strings.common.arrowUp, downArrow: strings.common.arrowDown, leftRightArrow: strings.common.arrowDouble, chevron: strings.common.chevron, parallelogram: strings.common.parallelogram, trapezoid: strings.common.trapezoid,
  mathPlus: strings.common.plus, heart: strings.common.heart, cloud: strings.common.cloud, wedgeRectCallout: strings.common.calloutRect, wedgeEllipseCallout: strings.common.calloutEllipse };
function descendants(node: Document | Element, name: string): Element[] { return [...node.getElementsByTagNameNS(strings.common.symbol_684888c0, name)]; }
function first(node: Document | Element, name: string): Element | undefined { return descendants(node, name)[0]; }
function number(node: Element | undefined, attribute: string, fallback = 0): number {
  const value = node?.getAttribute(attribute); const parsed = value === null || value === undefined ? fallback : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function text(node: Document | Element): string { return descendants(node, strings.common.p).map(paragraph => descendants(paragraph, strings.export.t).map(run => run.textContent ?? strings.common.empty).join(strings.common.empty)).join(strings.common.newline); }
function fill(node: Element | undefined, fallback: string = strings.common.colorffffff): Fill {
  if (!node) return { type: strings.common.solid, color: fallback };
  if ([...node.children].some(child => child.localName === strings.export.noFill)) return { type: strings.common.none };
  const solid = [...node.children].find(child => child.localName === strings.export.solidFill);
  const rgb = solid && first(solid, strings.export.srgbClr)?.getAttribute(strings.export.val);
  return { type: strings.common.solid, color: rgb ? `${strings.export.symbol_334359b9}${rgb}` : fallback };
}
function resolvePath(base: string, target: string): string {
  const parts = target.startsWith(strings.common.symbol_8a5edab2) ? [] : base.split(strings.common.symbol_8a5edab2).slice(0, -1);
  for (const part of target.split(strings.common.symbol_8a5edab2)) { if (part === strings.export.symbol) parts.pop(); else if (part && part !== strings.common.symbol_cdb4ee2a) parts.push(part); }
  return parts.join(strings.common.symbol_8a5edab2);
}
async function xml(zip: JSZip, path: string): Promise<Document> {
  const entry = zip.file(path); if (!entry) throw new Error(`${strings.export.powerPointFileIsMissing}${path}${strings.common.symbol_cdb4ee2a}`);
  const document = new DOMParser().parseFromString(await entry.async(strings.common.string), strings.export.applicationXml);
  if (document.getElementsByTagName(strings.export.parsererror).length) throw new Error(strings.export.thePowerPointFileContainsInvalidXML);
  return document;
}
async function relationships(zip: JSZip, path: string): Promise<Record<string, string>> {
  const parts = path.split(strings.common.symbol_8a5edab2); const name = parts.pop();
  const entry = zip.file(`${parts.join(strings.common.symbol_8a5edab2)}${strings.export.rels_6d75b6ac}${name}${strings.export.rels}`);
  if (!entry) return {};
  const document = new DOMParser().parseFromString(await entry.async(strings.common.string), strings.export.applicationXml);
  const output: Record<string, string> = {};
  for (const relation of descendants(document, strings.export.relationship)) {
    const id = relation.getAttribute(strings.export.id); const target = relation.getAttribute(strings.common.target);
    if (id && target && relation.getAttribute(strings.export.targetMode) !== strings.export.external) output[id] = resolvePath(path, target);
  }
  return output;
}
export async function importPptx(file: File): Promise<Presentation> {
  const zip = await JSZip.loadAsync(file);
  const root = await xml(zip, strings.export.pptPresentationXml);
  const rels = await relationships(zip, strings.export.pptPresentationXml);
  const size = first(root, strings.export.sldSz);
  const width = number(size, strings.export.cx, 12192000) / 6350;
  const height = number(size, strings.export.cy, 6858000) / 6350;
  const document = createPresentation(); document.title = file.name.replace(/\.pptx$/i, strings.common.empty);
  document.slideSize = { width, height }; document.slides = [];
  const assets: Record<string, string> = {};
  for (const slideReference of descendants(root, strings.export.sldId)) {
    const relation = slideReference.getAttributeNS(strings.export.httpSchemasOpenxmlformatsOrgOfficeDocument2006Relationships, strings.common.id);
    const path = relation ? rels[relation] : undefined; if (!path) continue;
    const source = await xml(zip, path); const links = await relationships(zip, path);
    const slide = createSlide(strings.common.blank_ff71cf74); slide.transition = { effect: strings.common.none, duration: 0 }; slide.background = { type: strings.common.solid, color: strings.common.colorffffff };
    const background = first(source, strings.export.bgPr); const backgroundFill = fill(background);
    if (backgroundFill.type !== strings.common.none) slide.background = backgroundFill;
    slide.skipped = first(source, strings.export.sld)?.getAttribute(strings.common.show) === strings.common.value0;
    for (const node of [...(first(source, strings.export.spTree)?.children ?? [])]) {
      if (!([strings.export.sp, strings.export.pic, strings.export.cxnSp, strings.export.graphicFrame] as readonly string[]).includes(node.localName)) continue;
      const transform = first(node, strings.export.xfrm); const offset = transform && first(transform, strings.export.off); const extent = transform && first(transform, strings.export.ext);
      const box = { x: number(offset, strings.common.x) / 6350, y: number(offset, strings.common.y) / 6350, width: number(extent, strings.export.cx, 1270000) / 6350,
        height: number(extent, strings.export.cy, 635000) / 6350, rotation: number(transform, strings.export.rot) / 60000, name: first(node, strings.export.cNvPr)?.getAttribute(strings.common.name) ?? strings.export.importedElement };
      const properties = first(node, strings.export.spPr); let element: SlideElement | undefined;
      if (node.localName === strings.export.pic) {
        const embedded = first(node, strings.export.blip)?.getAttributeNS(strings.export.httpSchemasOpenxmlformatsOrgOfficeDocument2006Relationships, strings.export.embed);
        const assetPath = embedded ? links[embedded] : undefined; const entry = assetPath ? zip.file(assetPath) : null;
        if (entry && assetPath) {
          const extension = assetPath.split(strings.common.symbol_cdb4ee2a).pop()?.toLowerCase();
          const mime: Record<string, string> = { jpg: strings.export.imageJpeg, jpeg: strings.export.imageJpeg, png: strings.common.imagePng, gif: strings.export.imageGif, svg: strings.export.imageSvgXml, webp: strings.export.imageWebp, bmp: strings.export.imageBmp };
          const contentType = extension ? mime[extension] : undefined;
          if (contentType) {
            const assetId = assets[assetPath] ?? (assets[assetPath] = await blobDataUrl(new Blob([await entry.async(strings.export.arraybuffer)], { type: contentType })));
            element = { ...createElement(strings.common.image), ...box, assetId, cornerRadius: 0, clipShape: strings.common.none, naturalWidth: Math.max(1, box.width), naturalHeight: Math.max(1, box.height) };
          }
        }
      } else if (node.localName === strings.export.cxnSp) {
        element = { ...createElement(strings.common.line), ...box, end: { x: box.width, y: box.height } };
      } else if (node.localName === strings.export.graphicFrame) {
        const table = first(node, strings.export.tbl);
        if (table) element = { ...createElement(strings.common.table), ...box,
          columnWidths: descendants(table, strings.export.gridCol).map(column => number(column, strings.common.w) / 6350),
          rows: descendants(table, strings.export.tr).map(row => ({ id: nanoid(), height: number(row, strings.export.h, 635000) / 6350,
            cells: [...row.children].filter(cell => cell.localName === strings.export.tc).map(cell => ({ id: nanoid(), content: textDocument(text(cell)), fill: fill(first(cell, strings.export.tcPr)),
              colSpan: number(cell, strings.export.gridSpan, 1), rowSpan: number(cell, strings.export.rowSpan, 1) })) })) };
        const chart = first(node, strings.common.chart); const chartId = chart?.getAttributeNS(strings.export.httpSchemasOpenxmlformatsOrgOfficeDocument2006Relationships, strings.common.id);
        const chartPath = chartId ? links[chartId] : undefined;
        if (chartPath) {
          const chartXml = await xml(zip, chartPath); const plot = first(chartXml, strings.export.plotArea);
          const kind = plot && [...plot.children].find(child => child.localName.endsWith(strings.common.chart_3e5b90ae));
          const chartTypes: Record<string, ChartKind> = { barChart: strings.common.bar, lineChart: strings.common.line, areaChart: strings.common.area, pieChart: strings.common.pie, doughnutChart: strings.common.donut, scatterChart: strings.common.scatter };
          const chartElement = createElement(strings.common.chart);
          chartElement.chart = chartTypes[kind?.localName ?? strings.common.empty] ?? strings.common.bar;
          chartElement.series = descendants(chartXml, strings.export.ser).map((series, index) => ({ id: nanoid(), name: first(series, strings.export.tx)?.textContent ?? `${strings.common.series}${index + 1}`,
            color: `${strings.export.symbol_334359b9}${first(series, strings.export.srgbClr)?.getAttribute(strings.export.val) ?? strings.export.ed7355}`,
            values: descendants(first(series, strings.export.val) ?? first(series, strings.export.yVal) ?? series, strings.export.pt).map(point => Number(first(point, strings.export.v)?.textContent ?? 0)) }));
          const category = first(chartXml, strings.export.cat); chartElement.categories = category ? descendants(category, strings.export.pt).map(point => first(point, strings.export.v)?.textContent ?? strings.common.empty) : [];
          element = { ...chartElement, ...box };
        }
      } else {
        const body = first(node, strings.export.txBody); const value = body ? text(body) : strings.common.empty;
        const preset = first(node, strings.export.prstGeom)?.getAttribute(strings.export.prst);
        if (preset && (preset !== strings.common.rect || !value)) element = { ...createElement(strings.common.shape, shapeKinds[preset] ?? strings.common.rect), ...box, fill: fill(properties), text: value ? textDocument(value) : null };
        else {
          const run = body && (first(body, strings.export.rPr) ?? first(body, strings.export.defRPr)); const paragraph = body && first(body, strings.export.pPr);
          const alignment = paragraph?.getAttribute(strings.export.algn);
          element = { ...createElement(strings.common.text), ...box, content: textDocument(value), fill: fill(properties, strings.common.colorffffff),
            fontSize: number(run, strings.export.sz, 2400) / 50, fontFamily: run ? first(run, strings.export.latin)?.getAttribute(strings.export.typeface) ?? strings.common.geist : strings.common.geist,
            color: `${strings.export.symbol_334359b9}${run ? first(run, strings.export.srgbClr)?.getAttribute(strings.export.val) ?? strings.export.value292825 : strings.export.value292825}`, bold: run?.getAttribute(strings.common.b) === strings.common.value1, italic: run?.getAttribute(strings.export.i) === strings.common.value1,
            align: alignment === strings.export.ctr ? strings.common.center : alignment === strings.export.r ? strings.common.right : strings.common.left };
        }
      }
      if (element) slide.elements.push(element);
    }
    const notePath = Object.values(links).find(value => value.includes(strings.export.notesSlides));
    if (notePath) slide.notes = text(await xml(zip, notePath));
    document.slides.push(slide);
  }
  if (!document.slides.length) throw new Error(strings.export.noReadableSlidesWereFoundInThisPowerPoint);
  return document;
}
