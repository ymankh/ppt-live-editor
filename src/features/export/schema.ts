import { z } from 'zod';
import type { Presentation, SlideElement, TipTapDocument } from '@/types/model';

const finite = z.number();
const positive = finite.positive();
const nonnegative = finite.nonnegative();
const id = z.string().min(1);
const color = z.string().min(1);
const attrs = z.record(z.string(), z.union([z.string(), finite, z.boolean(), z.null()]));
const richText: z.ZodType<TipTapDocument> = z.lazy(() => z.object({
  type: z.string(), attrs: attrs.optional(), text: z.string().optional(),
  content: z.array(richText).optional(),
  marks: z.array(z.object({ type: z.string(), attrs: attrs.optional() })).optional(),
}).transform((node): TipTapDocument => ({
  type: node.type,
  ...(node.attrs ? { attrs: node.attrs } : {}),
  ...(node.text !== undefined ? { text: node.text } : {}),
  ...(node.content ? { content: node.content } : {}),
  ...(node.marks ? { marks: node.marks.map(mark => ({ type: mark.type, ...(mark.attrs ? { attrs: mark.attrs } : {}) })) } : {}),
})));
const fill = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('solid'), color }),
  z.object({ type: z.literal('image'), assetId: id, fit: z.enum(['cover', 'contain', 'tile']) }),
  z.object({ type: z.literal('gradient'), gradient: z.object({ kind: z.enum(['linear', 'radial']), angle: finite,
    stops: z.array(z.object({ offset: finite.min(0).max(1), color })).min(1) }) }),
]);
const background = z.union([fill.options[1], fill.options[2], fill.options[3]]);
const stroke = z.object({ color, width: nonnegative, style: z.enum(['solid', 'dashed', 'dotted']) });
const shadow = z.object({ color, blur: nonnegative, offsetX: finite, offsetY: finite, spread: finite });
const point = z.object({ x: finite, y: finite });
const base = {
  id, name: z.string(), x: finite, y: finite, width: nonnegative, height: nonnegative,
  rotation: finite, opacity: finite.min(0).max(1), locked: z.boolean(), hidden: z.boolean(), groupId: id.optional(),
  link: z.discriminatedUnion('kind', [z.object({ kind: z.literal('url'), href: z.string().refine(value => /^(https?:|mailto:|tel:)/i.test(value), 'Unsafe hyperlink') }),
    z.object({ kind: z.literal('slide'), slideId: id })]).optional(),
  animations: z.array(z.object({ id, category: z.enum(['entrance', 'emphasis', 'exit']),
    effect: z.enum(['fadeIn', 'flyInLeft', 'flyInRight', 'flyInTop', 'flyInBottom', 'zoomIn', 'bounceIn', 'rotateIn', 'pulse', 'shake', 'swing', 'flash', 'wobble', 'fadeOut', 'flyOutLeft', 'flyOutRight', 'flyOutTop', 'flyOutBottom', 'zoomOut']),
    trigger: z.enum(['onClick', 'withPrevious', 'afterPrevious']), duration: nonnegative, delay: nonnegative })),
};
const vertical = z.enum(['top', 'middle', 'bottom']);
const elements = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('text'), content: richText, verticalAlign: vertical,
    autoFit: z.enum(['none', 'shrink', 'resize-shape']), padding: nonnegative, fill, stroke: stroke.nullable(), shadow: shadow.nullable(),
    cornerRadius: nonnegative, fontSize: positive, fontFamily: z.string(), color, bold: z.boolean(), italic: z.boolean(),
    align: z.enum(['left', 'center', 'right']), letterSpacing: finite }),
  z.object({ ...base, type: z.literal('shape'), shape: z.enum(['rect', 'roundRect', 'ellipse', 'triangle', 'rightTriangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'star5', 'star6', 'arrowRight', 'arrowLeft', 'arrowUp', 'arrowDown', 'arrowDouble', 'chevron', 'parallelogram', 'trapezoid', 'plus', 'heart', 'cloud', 'calloutRect', 'calloutEllipse']),
    fill, stroke: stroke.nullable(), shadow: shadow.nullable(), cornerRadius: nonnegative, flipH: z.boolean(), flipV: z.boolean(),
    text: richText.nullable(), textVerticalAlign: vertical }),
  z.object({ ...base, type: z.literal('line'), start: point, end: point, curve: z.enum(['straight', 'elbow', 'curved']), stroke,
    startArrow: z.enum(['none', 'arrow', 'triangle', 'circle', 'diamond', 'bar']), endArrow: z.enum(['none', 'arrow', 'triangle', 'circle', 'diamond', 'bar']) }),
  z.object({ ...base, type: z.literal('image'), assetId: id, naturalWidth: positive, naturalHeight: positive,
    crop: z.object({ x: finite, y: finite, width: positive, height: positive }),
    filters: z.object({ brightness: nonnegative, contrast: nonnegative, saturation: nonnegative, blur: nonnegative, grayscale: nonnegative }),
    flipH: z.boolean(), flipV: z.boolean(), stroke: stroke.nullable(), shadow: shadow.nullable(), cornerRadius: nonnegative,
    clipShape: z.enum(['none', 'ellipse', 'roundRect']) }),
  z.object({ ...base, type: z.literal('table'), rows: z.array(z.object({ id, height: positive,
    cells: z.array(z.object({ id, content: richText, fill, colSpan: z.number().int().positive(), rowSpan: z.number().int().positive() })) })),
    columnWidths: z.array(positive), style: z.object({ headerRow: z.boolean(), bandedRows: z.boolean(), borderColor: color,
      borderWidth: nonnegative, headerFill: fill }) }),
  z.object({ ...base, type: z.literal('chart'), chart: z.enum(['bar', 'barHorizontal', 'line', 'area', 'pie', 'donut', 'scatter']),
    categories: z.array(z.string()), series: z.array(z.object({ id, name: z.string(), color, values: z.array(finite) })),
    options: z.object({ showLegend: z.boolean(), showGrid: z.boolean(), showValues: z.boolean(), stacked: z.boolean(), title: z.string() }) }),
]).transform((value): SlideElement => {
  const { groupId, link, ...element } = value;
  return { ...element, ...(groupId !== undefined ? { groupId } : {}), ...(link ? { link } : {}) };
});
export const presentationSchema: z.ZodType<Presentation> = z.object({
  version: z.literal(1), id, title: z.string(), slideSize: z.object({ width: positive, height: positive }),
  theme: z.object({ id, name: z.string(), colors: z.object({ background: color, text: color, primary: color, secondary: color, accent: z.array(color) }),
    fonts: z.object({ heading: z.string(), body: z.string() }) }),
  slides: z.array(z.object({ id, elements: z.array(elements), background, notes: z.string(),
    transition: z.object({ effect: z.enum(['none', 'fade', 'slideLeft', 'slideRight', 'push', 'zoom', 'flip', 'cube']), duration: nonnegative }),
    layoutId: z.string().optional(), skipped: z.boolean().optional() }).transform(value => {
      const { layoutId, skipped, ...slide } = value;
      return { ...slide, ...(layoutId !== undefined ? { layoutId } : {}), ...(skipped !== undefined ? { skipped } : {}) };
    })).min(1),
  createdAt: z.string(), updatedAt: z.string(),
}).superRefine((document, context) => {
  const slideIds = new Set<string>();
  const elementIds = new Set<string>();
  for (const slide of document.slides) {
    if (slideIds.has(slide.id)) context.addIssue({ code: 'custom', message: 'Duplicate slide ID' });
    slideIds.add(slide.id);
    for (const element of slide.elements) {
      if (elementIds.has(element.id)) context.addIssue({ code: 'custom', message: 'Duplicate element ID' });
      elementIds.add(element.id);
    }
  }
});
