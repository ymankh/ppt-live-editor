
import { strings } from "@/strings";
export type Id = string;
export interface TipTapDocument { type: string; attrs?: Record<string, string | number | boolean | null>; content?: TipTapDocument[]; marks?: { type: string; attrs?: Record<string, string | number | boolean | null> }[]; text?: string }
export interface Point { x: number; y: number }
export type ShapeKind = 'rect' | 'roundRect' | 'ellipse' | 'triangle' | 'rightTriangle' | 'diamond' | 'pentagon' | 'hexagon' | 'octagon' | 'star5' | 'star6' | 'arrowRight' | 'arrowLeft' | 'arrowUp' | 'arrowDown' | 'arrowDouble' | 'chevron' | 'parallelogram' | 'trapezoid' | 'plus' | 'heart' | 'cloud' | 'calloutRect' | 'calloutEllipse';
export interface Gradient { kind: 'linear' | 'radial'; angle: number; stops: { offset: number; color: string }[] }
export type Fill = { type: 'none' } | { type: 'solid'; color: string } | { type: 'gradient'; gradient: Gradient } | { type: 'image'; assetId: Id; fit: 'cover' | 'contain' | 'tile' };
export type Background = Exclude<Fill, { type: 'none' }>;
export interface Stroke { color: string; width: number; style: 'solid' | 'dashed' | 'dotted' }
export interface Shadow { color: string; blur: number; offsetX: number; offsetY: number; spread: number }
export type AnimationEffect = 'fadeIn' | 'flyInLeft' | 'flyInRight' | 'flyInTop' | 'flyInBottom' | 'zoomIn' | 'bounceIn' | 'rotateIn' | 'pulse' | 'shake' | 'swing' | 'flash' | 'wobble' | 'fadeOut' | 'flyOutLeft' | 'flyOutRight' | 'flyOutTop' | 'flyOutBottom' | 'zoomOut';
export interface Animation { id: Id; category: 'entrance' | 'emphasis' | 'exit'; effect: AnimationEffect; trigger: 'onClick' | 'withPrevious' | 'afterPrevious'; duration: number; delay: number }
export interface Transition { effect: 'none' | 'fade' | 'slideLeft' | 'slideRight' | 'push' | 'zoom' | 'flip' | 'cube'; duration: number }
export interface ElementBase { id: Id; name: string; x: number; y: number; width: number; height: number; rotation: number; opacity: number; locked: boolean; hidden: boolean; groupId?: Id; animations: Animation[]; link?: { kind: 'url'; href: string } | { kind: 'slide'; slideId: Id } }
export interface TextElement extends ElementBase { type: 'text'; content: TipTapDocument; verticalAlign: 'top' | 'middle' | 'bottom'; autoFit: 'none' | 'shrink' | 'resize-shape'; padding: number; fill: Fill; stroke: Stroke | null; shadow: Shadow | null; cornerRadius: number; fontSize: number; fontFamily: string; color: string; bold: boolean; italic: boolean; align: 'left' | 'center' | 'right'; letterSpacing: number }
export interface ShapeElement extends ElementBase { type: 'shape'; shape: ShapeKind; fill: Fill; stroke: Stroke | null; shadow: Shadow | null; cornerRadius: number; flipH: boolean; flipV: boolean; text: TipTapDocument | null; textVerticalAlign: 'top' | 'middle' | 'bottom' }
export type ArrowHead = 'none' | 'arrow' | 'triangle' | 'circle' | 'diamond' | 'bar';
export interface LineElement extends ElementBase { type: 'line'; start: Point; end: Point; curve: 'straight' | 'elbow' | 'curved'; stroke: Stroke; startArrow: ArrowHead; endArrow: ArrowHead }
export interface ImageElement extends ElementBase { type: 'image'; assetId: Id; naturalWidth: number; naturalHeight: number; crop: { x: number; y: number; width: number; height: number }; filters: { brightness: number; contrast: number; saturation: number; blur: number; grayscale: number }; flipH: boolean; flipV: boolean; stroke: Stroke | null; shadow: Shadow | null; cornerRadius: number; clipShape: 'none' | 'ellipse' | 'roundRect' }
export interface TableCell { id: Id; content: TipTapDocument; fill: Fill; colSpan: number; rowSpan: number }
export interface TableElement extends ElementBase { type: 'table'; rows: { id: Id; height: number; cells: TableCell[] }[]; columnWidths: number[]; style: { headerRow: boolean; bandedRows: boolean; borderColor: string; borderWidth: number; headerFill: Fill } }
export type ChartKind = 'bar' | 'barHorizontal' | 'line' | 'area' | 'pie' | 'donut' | 'scatter';
export interface ChartElement extends ElementBase { type: 'chart'; chart: ChartKind; categories: string[]; series: { id: Id; name: string; color: string; values: number[] }[]; options: { showLegend: boolean; showGrid: boolean; showValues: boolean; stacked: boolean; title: string } }
export type SlideElement = TextElement | ShapeElement | LineElement | ImageElement | TableElement | ChartElement;
export type ElementType = SlideElement['type'];
export type ElementOf<T extends ElementType> = Extract<SlideElement, { type: T }>;
export interface Theme { id: Id; name: string; colors: { background: string; text: string; primary: string; secondary: string; accent: readonly string[] }; fonts: { heading: string; body: string } }
export interface Slide { id: Id; elements: SlideElement[]; background: Background; notes: string; transition: Transition; layoutId?: string; skipped?: boolean }
export interface Presentation { version: 1; id: Id; title: string; slideSize: { width: number; height: number }; theme: Theme; slides: Slide[]; createdAt: string; updatedAt: string }
export const plainText = (node: TipTapDocument): string => node.text ?? node.content?.map(plainText).join(node.type === strings.common.doc ? strings.common.newline : strings.common.empty) ?? strings.common.empty;
export const textDocument = (text: string): TipTapDocument => ({ type: strings.common.doc, content: text.split(strings.common.newline).map(line => ({ type: strings.common.paragraph, content: line ? [{ type: strings.common.text, text: line }] : [] })) });
