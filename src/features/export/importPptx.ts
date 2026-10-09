import JSZip from 'jszip';
import { nanoid } from 'nanoid';
import { createElement, createPresentation, createSlide } from '@/lib/defaults';
import { textDocument } from '@/types/model';
import type { ChartKind, Fill, Presentation, ShapeKind, SlideElement } from '@/types/model';
import { blobDataUrl } from './assets';

const shapeKinds: Record<string, ShapeKind> = { rect: 'rect', roundRect: 'roundRect', ellipse: 'ellipse', triangle: 'triangle', rtTriangle: 'rightTriangle',
  diamond: 'diamond', pentagon: 'pentagon', hexagon: 'hexagon', octagon: 'octagon', star5: 'star5', star6: 'star6', rightArrow: 'arrowRight', leftArrow: 'arrowLeft',
  upArrow: 'arrowUp', downArrow: 'arrowDown', leftRightArrow: 'arrowDouble', chevron: 'chevron', parallelogram: 'parallelogram', trapezoid: 'trapezoid',
  mathPlus: 'plus', heart: 'heart', cloud: 'cloud', wedgeRectCallout: 'calloutRect', wedgeEllipseCallout: 'calloutEllipse' };
function descendants(node: Document | Element, name: string): Element[] { return [...node.getElementsByTagNameNS('*', name)]; }
function first(node: Document | Element, name: string): Element | undefined { return descendants(node, name)[0]; }
function number(node: Element | undefined, attribute: string, fallback = 0): number {
  const value = node?.getAttribute(attribute); const parsed = value === null || value === undefined ? fallback : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function text(node: Document | Element): string { return descendants(node, 'p').map(paragraph => descendants(paragraph, 't').map(run => run.textContent ?? '').join('')).join('\n'); }
function fill(node: Element | undefined, fallback = '#ffffff'): Fill {
  if (!node) return { type: 'solid', color: fallback };
  if ([...node.children].some(child => child.localName === 'noFill')) return { type: 'none' };
  const solid = [...node.children].find(child => child.localName === 'solidFill');
  const rgb = solid && first(solid, 'srgbClr')?.getAttribute('val');
  return { type: 'solid', color: rgb ? `#${rgb}` : fallback };
}
function resolvePath(base: string, target: string): string {
  const parts = target.startsWith('/') ? [] : base.split('/').slice(0, -1);
  for (const part of target.split('/')) { if (part === '..') parts.pop(); else if (part && part !== '.') parts.push(part); }
  return parts.join('/');
}
async function xml(zip: JSZip, path: string): Promise<Document> {
  const entry = zip.file(path); if (!entry) throw new Error(`PowerPoint file is missing ${path}.`);
  const document = new DOMParser().parseFromString(await entry.async('string'), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('The PowerPoint file contains invalid XML.');
  return document;
}
async function relationships(zip: JSZip, path: string): Promise<Record<string, string>> {
  const parts = path.split('/'); const name = parts.pop();
  const entry = zip.file(`${parts.join('/')}/_rels/${name}.rels`);
  if (!entry) return {};
  const document = new DOMParser().parseFromString(await entry.async('string'), 'application/xml');
  const output: Record<string, string> = {};
  for (const relation of descendants(document, 'Relationship')) {
    const id = relation.getAttribute('Id'); const target = relation.getAttribute('Target');
    if (id && target && relation.getAttribute('TargetMode') !== 'External') output[id] = resolvePath(path, target);
  }
  return output;
}
export async function importPptx(file: File): Promise<Presentation> {
  const zip = await JSZip.loadAsync(file);
  const root = await xml(zip, 'ppt/presentation.xml');
  const rels = await relationships(zip, 'ppt/presentation.xml');
  const size = first(root, 'sldSz');
  const width = number(size, 'cx', 12192000) / 6350;
  const height = number(size, 'cy', 6858000) / 6350;
  const document = createPresentation(); document.title = file.name.replace(/\.pptx$/i, '');
  document.slideSize = { width, height }; document.slides = [];
  const assets: Record<string, string> = {};
  for (const slideReference of descendants(root, 'sldId')) {
    const relation = slideReference.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const path = relation ? rels[relation] : undefined; if (!path) continue;
    const source = await xml(zip, path); const links = await relationships(zip, path);
    const slide = createSlide('blank'); slide.transition = { effect: 'none', duration: 0 }; slide.background = { type: 'solid', color: '#ffffff' };
    const background = first(source, 'bgPr'); const backgroundFill = fill(background);
    if (backgroundFill.type !== 'none') slide.background = backgroundFill;
    slide.skipped = first(source, 'sld')?.getAttribute('show') === '0';
    for (const node of [...(first(source, 'spTree')?.children ?? [])]) {
      if (!['sp', 'pic', 'cxnSp', 'graphicFrame'].includes(node.localName)) continue;
      const transform = first(node, 'xfrm'); const offset = transform && first(transform, 'off'); const extent = transform && first(transform, 'ext');
      const box = { x: number(offset, 'x') / 6350, y: number(offset, 'y') / 6350, width: number(extent, 'cx', 1270000) / 6350,
        height: number(extent, 'cy', 635000) / 6350, rotation: number(transform, 'rot') / 60000, name: first(node, 'cNvPr')?.getAttribute('name') ?? 'Imported element' };
      const properties = first(node, 'spPr'); let element: SlideElement | undefined;
      if (node.localName === 'pic') {
        const embedded = first(node, 'blip')?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
        const assetPath = embedded ? links[embedded] : undefined; const entry = assetPath ? zip.file(assetPath) : null;
        if (entry && assetPath) {
          const extension = assetPath.split('.').pop()?.toLowerCase();
          const mime: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp' };
          const contentType = extension ? mime[extension] : undefined;
          if (contentType) {
            const assetId = assets[assetPath] ?? (assets[assetPath] = await blobDataUrl(new Blob([await entry.async('arraybuffer')], { type: contentType })));
            element = { ...createElement('image'), ...box, assetId, cornerRadius: 0, clipShape: 'none', naturalWidth: Math.max(1, box.width), naturalHeight: Math.max(1, box.height) };
          }
        }
      } else if (node.localName === 'cxnSp') {
        element = { ...createElement('line'), ...box, end: { x: box.width, y: box.height } };
      } else if (node.localName === 'graphicFrame') {
        const table = first(node, 'tbl');
        if (table) element = { ...createElement('table'), ...box,
          columnWidths: descendants(table, 'gridCol').map(column => number(column, 'w') / 6350),
          rows: descendants(table, 'tr').map(row => ({ id: nanoid(), height: number(row, 'h', 635000) / 6350,
            cells: [...row.children].filter(cell => cell.localName === 'tc').map(cell => ({ id: nanoid(), content: textDocument(text(cell)), fill: fill(first(cell, 'tcPr')),
              colSpan: number(cell, 'gridSpan', 1), rowSpan: number(cell, 'rowSpan', 1) })) })) };
        const chart = first(node, 'chart'); const chartId = chart?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        const chartPath = chartId ? links[chartId] : undefined;
        if (chartPath) {
          const chartXml = await xml(zip, chartPath); const plot = first(chartXml, 'plotArea');
          const kind = plot && [...plot.children].find(child => child.localName.endsWith('Chart'));
          const chartTypes: Record<string, ChartKind> = { barChart: 'bar', lineChart: 'line', areaChart: 'area', pieChart: 'pie', doughnutChart: 'donut', scatterChart: 'scatter' };
          const chartElement = createElement('chart');
          chartElement.chart = chartTypes[kind?.localName ?? ''] ?? 'bar';
          chartElement.series = descendants(chartXml, 'ser').map((series, index) => ({ id: nanoid(), name: first(series, 'tx')?.textContent ?? `Series ${index + 1}`,
            color: `#${first(series, 'srgbClr')?.getAttribute('val') ?? 'ed7355'}`,
            values: descendants(first(series, 'val') ?? first(series, 'yVal') ?? series, 'pt').map(point => Number(first(point, 'v')?.textContent ?? 0)) }));
          const category = first(chartXml, 'cat'); chartElement.categories = category ? descendants(category, 'pt').map(point => first(point, 'v')?.textContent ?? '') : [];
          element = { ...chartElement, ...box };
        }
      } else {
        const body = first(node, 'txBody'); const value = body ? text(body) : '';
        const preset = first(node, 'prstGeom')?.getAttribute('prst');
        if (preset && (preset !== 'rect' || !value)) element = { ...createElement('shape', shapeKinds[preset] ?? 'rect'), ...box, fill: fill(properties), text: value ? textDocument(value) : null };
        else {
          const run = body && (first(body, 'rPr') ?? first(body, 'defRPr')); const paragraph = body && first(body, 'pPr');
          const alignment = paragraph?.getAttribute('algn');
          element = { ...createElement('text'), ...box, content: textDocument(value), fill: fill(properties, '#ffffff'),
            fontSize: number(run, 'sz', 2400) / 50, fontFamily: run ? first(run, 'latin')?.getAttribute('typeface') ?? 'Geist' : 'Geist',
            color: `#${run ? first(run, 'srgbClr')?.getAttribute('val') ?? '292825' : '292825'}`, bold: run?.getAttribute('b') === '1', italic: run?.getAttribute('i') === '1',
            align: alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : 'left' };
        }
      }
      if (element) slide.elements.push(element);
    }
    const notePath = Object.values(links).find(value => value.includes('/notesSlides/'));
    if (notePath) slide.notes = text(await xml(zip, notePath));
    document.slides.push(slide);
  }
  if (!document.slides.length) throw new Error('No readable slides were found in this PowerPoint file.');
  return document;
}
