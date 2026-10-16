import { z } from 'zod';
import type { Presentation, SlideElement, TipTapDocument } from '@/types/model';
import { strings } from "@/strings";


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
const fill = z.discriminatedUnion(strings.common.type, [
  z.object({ type: z.literal(strings.common.none) }),
  z.object({ type: z.literal(strings.common.solid), color }),
  z.object({ type: z.literal(strings.common.image), assetId: id, fit: z.enum([strings.common.cover, strings.common.contain, strings.common.tile]) }),
  z.object({ type: z.literal(strings.common.gradient), gradient: z.object({ kind: z.enum([strings.common.linear, strings.common.radial]), angle: finite,
    stops: z.array(z.object({ offset: finite.min(0).max(1), color })).min(1) }) }),
]);
const background = z.union([fill.options[1], fill.options[2], fill.options[3]]);
const stroke = z.object({ color, width: nonnegative, style: z.enum([strings.common.solid, strings.common.dashed, strings.common.dotted]) });
const shadow = z.object({ color, blur: nonnegative, offsetX: finite, offsetY: finite, spread: finite });
const point = z.object({ x: finite, y: finite });
const base = {
  id, name: z.string(), x: finite, y: finite, width: nonnegative, height: nonnegative,
  rotation: finite, opacity: finite.min(0).max(1), locked: z.boolean(), hidden: z.boolean(), groupId: id.optional(),
  link: z.discriminatedUnion(strings.export.kind, [z.object({ kind: z.literal(strings.common.url), href: z.string().refine(value => /^(https?:|mailto:|tel:)/i.test(value), strings.export.unsafeHyperlink) }),
    z.object({ kind: z.literal(strings.common.slide), slideId: id })]).optional(),
  animations: z.array(z.object({ id, category: z.enum([strings.common.entrance, strings.common.emphasis, strings.common.exit]),
    effect: z.enum([strings.common.fadeIn, strings.common.flyInLeft, strings.common.flyInRight, strings.common.flyInTop, strings.common.flyInBottom, strings.common.zoomIn_d60e2474, strings.common.bounceIn, strings.common.rotateIn, strings.common.pulse, strings.common.shake, strings.common.swing, strings.common.flash, strings.common.wobble, strings.common.fadeOut, strings.common.flyOutLeft, strings.common.flyOutRight, strings.common.flyOutTop, strings.common.flyOutBottom, strings.common.zoomOut_77016e00]),
    trigger: z.enum([strings.common.onClick, strings.common.withPrevious, strings.common.afterPrevious]), duration: nonnegative, delay: nonnegative })),
};
const vertical = z.enum([strings.common.top, strings.common.middle, strings.common.bottom]);
const elements = z.discriminatedUnion(strings.common.type, [
  z.object({ ...base, type: z.literal(strings.common.text), content: richText, verticalAlign: vertical,
    autoFit: z.enum([strings.common.none, strings.common.shrink, strings.common.resizeShape]), padding: nonnegative, fill, stroke: stroke.nullable(), shadow: shadow.nullable(),
    cornerRadius: nonnegative, fontSize: positive, fontFamily: z.string(), color, bold: z.boolean(), italic: z.boolean(),
    align: z.enum([strings.common.left, strings.common.center, strings.common.right]), letterSpacing: finite }),
  z.object({ ...base, type: z.literal(strings.common.shape), shape: z.enum([strings.common.rect, strings.common.roundRect, strings.common.ellipse, strings.common.triangle, strings.common.rightTriangle, strings.common.diamond, strings.common.pentagon, strings.common.hexagon, strings.common.octagon, strings.common.star5, strings.common.star6, strings.common.arrowRight, strings.common.arrowLeft, strings.common.arrowUp, strings.common.arrowDown, strings.common.arrowDouble, strings.common.chevron, strings.common.parallelogram, strings.common.trapezoid, strings.common.plus, strings.common.heart, strings.common.cloud, strings.common.calloutRect, strings.common.calloutEllipse]),
    fill, stroke: stroke.nullable(), shadow: shadow.nullable(), cornerRadius: nonnegative, flipH: z.boolean(), flipV: z.boolean(),
    text: richText.nullable(), textVerticalAlign: vertical }),
  z.object({ ...base, type: z.literal(strings.common.line), start: point, end: point, curve: z.enum([strings.common.straight, strings.common.elbow, strings.common.curved]), stroke,
    startArrow: z.enum([strings.common.none, strings.common.arrow, strings.common.triangle, strings.common.circle, strings.common.diamond, strings.common.bar]), endArrow: z.enum([strings.common.none, strings.common.arrow, strings.common.triangle, strings.common.circle, strings.common.diamond, strings.common.bar]) }),
  z.object({ ...base, type: z.literal(strings.common.image), assetId: id, naturalWidth: positive, naturalHeight: positive,
    crop: z.object({ x: finite, y: finite, width: positive, height: positive }),
    filters: z.object({ brightness: nonnegative, contrast: nonnegative, saturation: nonnegative, blur: nonnegative, grayscale: nonnegative }),
    flipH: z.boolean(), flipV: z.boolean(), stroke: stroke.nullable(), shadow: shadow.nullable(), cornerRadius: nonnegative,
    clipShape: z.enum([strings.common.none, strings.common.ellipse, strings.common.roundRect]) }),
  z.object({ ...base, type: z.literal(strings.common.table), rows: z.array(z.object({ id, height: positive,
    cells: z.array(z.object({ id, content: richText, fill, colSpan: z.number().int().positive(), rowSpan: z.number().int().positive() })) })),
    columnWidths: z.array(positive), style: z.object({ headerRow: z.boolean(), bandedRows: z.boolean(), borderColor: color,
      borderWidth: nonnegative, headerFill: fill }) }),
  z.object({ ...base, type: z.literal(strings.common.chart), chart: z.enum([strings.common.bar, strings.common.barHorizontal, strings.common.line, strings.common.area, strings.common.pie, strings.common.donut, strings.common.scatter]),
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
    transition: z.object({ effect: z.enum([strings.common.none, strings.common.fade, strings.common.slideLeft, strings.common.slideRight, strings.common.push, strings.common.zoom, strings.common.flip, strings.common.cube]), duration: nonnegative }),
    layoutId: z.string().optional(), skipped: z.boolean().optional() }).transform(value => {
      const { layoutId, skipped, ...slide } = value;
      return { ...slide, ...(layoutId !== undefined ? { layoutId } : {}), ...(skipped !== undefined ? { skipped } : {}) };
    })).min(1),
  createdAt: z.string(), updatedAt: z.string(),
}).superRefine((document, context) => {
  const slideIds = new Set<string>();
  const elementIds = new Set<string>();
  for (const slide of document.slides) {
    if (slideIds.has(slide.id)) context.addIssue({ code: strings.export.custom, message: strings.export.duplicateSlideID });
    slideIds.add(slide.id);
    for (const element of slide.elements) {
      if (elementIds.has(element.id)) context.addIssue({ code: strings.export.custom, message: strings.export.duplicateElementID });
      elementIds.add(element.id);
    }
  }
});
