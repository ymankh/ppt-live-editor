import { memo,useId, type CSSProperties } from 'react';
import type { ArrowHead, Fill, Shadow, Slide, SlideElement, Stroke, Theme } from '@/types/model';
import { useEditor } from '@/store/editor';
import { shapePath } from '@/lib/geometry';
import { RichText } from './RichText';
import { ChartRenderer } from './ChartRenderer';
import './renderer.css';
import { strings } from "@/strings";
import { assetUrl } from '@/features/persistence/repository';


export interface SlideRendererProps { slide: Slide; theme: Theme; width?: number; interactive?: boolean; logicalSize?:{width:number;height:number} }
export function fillStyle(fill: Fill): CSSProperties {
  switch (fill.type) {
    case strings.common.none: return { background: strings.renderer.transparent };
    case strings.common.solid: return { background: fill.color };
    case strings.common.image: return { backgroundImage: `${strings.renderer.url}${JSON.stringify(assetUrl(fill.assetId))}${strings.common.symbol_ba5ec51d}`, backgroundSize: fill.fit === strings.common.tile ? strings.renderer.auto : fill.fit, backgroundRepeat: fill.fit === strings.common.tile ? strings.renderer.repeat : strings.renderer.noRepeat, backgroundPosition: strings.common.center };
    case strings.common.gradient: {
      const stops = fill.gradient.stops.map(s => `${s.color}${strings.common.space}${s.offset * 100}${strings.common.symbol_bbf3f11c}`).join(strings.renderer.symbol);
      return { background: fill.gradient.kind === strings.common.radial ? `${strings.renderer.radialGradientCircle}${stops}${strings.common.symbol_ba5ec51d}` : `${strings.renderer.linearGradient}${fill.gradient.angle}${strings.renderer.deg}${stops}${strings.common.symbol_ba5ec51d}` };
    }
  }
}
function decorationStyle(stroke: Stroke | null, shadow: Shadow | null): CSSProperties {
  return { border: stroke ? `${stroke.width}${strings.common.px_2e0dd922}${stroke.style}${strings.common.space}${stroke.color}` : undefined, boxShadow: shadow ? `${shadow.offsetX}${strings.common.px_2e0dd922}${shadow.offsetY}${strings.common.px_2e0dd922}${shadow.blur}${strings.common.px_2e0dd922}${shadow.spread}${strings.common.px_2e0dd922}${shadow.color}` : undefined };
}
function SvgFill({ fill, id }: { fill: Fill; id: string }) {
  if (fill.type === strings.common.gradient) {
    const stops = fill.gradient.stops.map((s, i) => <stop key={i} offset={`${s.offset * 100}${strings.common.symbol_bbf3f11c}`} stopColor={s.color} />);
    if (fill.gradient.kind === strings.common.radial) return <radialGradient id={id}>{stops}</radialGradient>;
    const angle = fill.gradient.angle * Math.PI / 180;
    return <linearGradient id={id} x1={`${50 - Math.sin(angle) * 50}${strings.common.symbol_bbf3f11c}`} y1={`${50 + Math.cos(angle) * 50}${strings.common.symbol_bbf3f11c}`} x2={`${50 + Math.sin(angle) * 50}${strings.common.symbol_bbf3f11c}`} y2={`${50 - Math.cos(angle) * 50}${strings.common.symbol_bbf3f11c}`}>{stops}</linearGradient>;
  }
  if (fill.type === strings.common.image) return <pattern id={id} width={strings.common.value1} height={strings.common.value1} patternContentUnits={strings.renderer.objectBoundingBox}><image href={assetUrl(fill.assetId)} width={strings.common.value1} height={strings.common.value1} preserveAspectRatio={fill.fit === strings.common.contain ? strings.renderer.xMidYMidMeet : strings.renderer.xMidYMidSlice} /></pattern>;
  return null;
}
function ArrowMarker({ head, id, color }: { head: ArrowHead; id: string; color: string }) {
  if (head === strings.common.none) return null;
  return <marker id={id} viewBox={strings.renderer.value001212} refX={strings.common.value10} refY={strings.renderer.value6} markerWidth={strings.common.value5} markerHeight={strings.common.value5} orient={strings.renderer.autoStartReverse}>
    {head === strings.common.circle ? <circle cx={strings.renderer.value6} cy={strings.renderer.value6} r={strings.common.value4} fill={color} /> : head === strings.common.diamond ? <path d={strings.renderer.m06L60126612Z} fill={color} /> : head === strings.common.bar ? <path d={strings.renderer.m80V12} stroke={color} strokeWidth={strings.common.value2} /> : <path d={strings.renderer.m11L106111} fill={head === strings.common.triangle ? color : strings.common.none} stroke={color} strokeWidth={strings.common.value2} />}
  </marker>;
}
function ElementContent({ element, theme, interactive }: { element: SlideElement; theme: Theme; interactive: boolean }) {
  const id = useId().replace(/:/g, strings.common.empty);
  const commit = (content: Parameters<typeof RichText>[0]['content']) => {
    useEditor.getState().mutate(strings.renderer.editText, draft => {
      const current = draft.slides.flatMap(s => s.elements).find(e => e.id === element.id);
      if (current?.type === strings.common.text) current.content = content;
      if (current?.type === strings.common.shape) current.text = content;
    });
  };
  switch (element.type) {
    case strings.common.text: return <div className={strings.renderer.rendererTextFrame} style={{ ...fillStyle(element.fill), ...decorationStyle(element.stroke, element.shadow), borderRadius: element.cornerRadius, padding: element.padding, justifyContent: element.verticalAlign === strings.common.middle ? strings.common.center : element.verticalAlign === strings.common.bottom ? strings.renderer.flexEnd : strings.renderer.flexStart }}>
      <RichText content={element.content} interactive={interactive} onCommit={commit} style={{ fontFamily: `${element.fontFamily || theme.fonts.body}${strings.renderer.geistVariableSansSerif}`, fontSize: element.fontSize, color: element.color || theme.colors.text, fontWeight: element.bold ? 700 : 400, fontStyle: element.italic ? strings.common.italic : strings.renderer.normal, textAlign: element.align, letterSpacing: element.letterSpacing }} />
    </div>;
    case strings.common.shape: {
      const fill = element.fill.type === strings.common.solid ? element.fill.color : element.fill.type === strings.common.none ? strings.common.none : `${strings.renderer.url_1c63a2c3}${id}${strings.renderer.fill_edd78703}`;
      return <div className={strings.renderer.rendererShapeFrame}>
        <svg width={strings.common.value100} height={strings.common.value100} viewBox={strings.renderer.value00100100} preserveAspectRatio={strings.common.none} style={{ overflow: strings.renderer.visible, filter: element.shadow ? `${strings.renderer.dropShadow}${element.shadow.offsetX}${strings.common.px_2e0dd922}${element.shadow.offsetY}${strings.common.px_2e0dd922}${element.shadow.blur}${strings.common.px_2e0dd922}${element.shadow.color}${strings.common.symbol_ba5ec51d}` : undefined, transform: `${strings.common.scale}${element.flipH ? -1 : 1}${strings.renderer.symbol}${element.flipV ? -1 : 1}${strings.common.symbol_ba5ec51d}` }}>
          <defs><SvgFill fill={element.fill} id={`${id}${strings.renderer.fill}`} /></defs>
          <path d={shapePath(element.shape, element.cornerRadius / Math.max(1, Math.min(element.width, element.height)) * 100)} fill={fill} stroke={element.stroke?.color ?? strings.common.none} strokeWidth={element.stroke?.width ?? 0} vectorEffect={strings.renderer.nonScalingStroke} strokeDasharray={element.stroke?.style === strings.common.dashed ? strings.renderer.value128 : element.stroke?.style === strings.common.dotted ? strings.renderer.value26 : undefined} />
        </svg>
        {element.text && <div className={strings.renderer.rendererShapeText} style={{ justifyContent: element.textVerticalAlign === strings.common.middle ? strings.common.center : element.textVerticalAlign === strings.common.bottom ? strings.renderer.flexEnd : strings.renderer.flexStart, color: theme.colors.text, fontFamily: `${theme.fonts.body}${strings.renderer.geistVariableSansSerif}` }}><RichText content={element.text} interactive={interactive} onCommit={commit} /></div>}
      </div>;
    }
    case strings.common.line: {
      const { start, end, curve, stroke } = element;
      const path = curve === strings.common.straight ? `${strings.common.m}${start.x}${strings.common.space}${start.y}${strings.renderer.l}${end.x}${strings.common.space}${end.y}` : curve === strings.common.elbow ? `${strings.common.m}${start.x}${strings.common.space}${start.y}${strings.renderer.h}${(start.x + end.x) / 2}${strings.common.v}${end.y}${strings.renderer.h}${end.x}` : `${strings.common.m}${start.x}${strings.common.space}${start.y}${strings.renderer.c}${(start.x + end.x) / 2}${strings.common.space}${start.y}${strings.renderer.symbol}${(start.x + end.x) / 2}${strings.common.space}${end.y}${strings.renderer.symbol}${end.x}${strings.common.space}${end.y}`;
      return <svg width={strings.common.value100} height={strings.common.value100} viewBox={`${strings.common.value00}${Math.max(1, element.width)}${strings.common.space}${Math.max(1, element.height)}`} className={strings.renderer.rendererLine}><defs><ArrowMarker head={element.startArrow} id={`${id}${strings.renderer.start}`} color={stroke.color} /><ArrowMarker head={element.endArrow} id={`${id}${strings.renderer.end}`} color={stroke.color} /></defs><path d={path} fill={strings.common.none} stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap={strings.common.round} strokeDasharray={stroke.style === strings.common.dashed ? strings.renderer.value1610 : stroke.style === strings.common.dotted ? strings.renderer.value28 : undefined} markerStart={element.startArrow === strings.common.none ? undefined : `${strings.renderer.url_1c63a2c3}${id}${strings.renderer.start_c491a08f}`} markerEnd={element.endArrow === strings.common.none ? undefined : `${strings.renderer.url_1c63a2c3}${id}${strings.renderer.end_fa9fa6dc}`} /></svg>;
    }
    case strings.common.image: {
      const cropWidth = Math.max(0.001, element.crop.width), cropHeight = Math.max(0.001, element.crop.height);
      return <div className={strings.renderer.rendererImageFrame} style={{ ...decorationStyle(element.stroke, element.shadow), borderRadius: element.clipShape === strings.common.ellipse ? strings.common.value50 : element.cornerRadius, overflow: strings.common.hidden }}>
        <img draggable={false} src={assetUrl(element.assetId)} alt={element.name} style={{ width: `${100 / cropWidth}${strings.common.symbol_bbf3f11c}`, height: `${100 / cropHeight}${strings.common.symbol_bbf3f11c}`, maxWidth: strings.common.none, position: strings.renderer.absolute, left: `${-element.crop.x / cropWidth * 100}${strings.common.symbol_bbf3f11c}`, top: `${-element.crop.y / cropHeight * 100}${strings.common.symbol_bbf3f11c}`, objectFit: strings.common.cover, transform: `${strings.common.scale}${element.flipH ? -1 : 1}${strings.renderer.symbol}${element.flipV ? -1 : 1}${strings.common.symbol_ba5ec51d}`, filter: `${strings.renderer.brightness}${element.filters.brightness}${strings.renderer.contrast}${element.filters.contrast}${strings.renderer.saturate}${element.filters.saturation}${strings.renderer.blur}${element.filters.blur}${strings.renderer.pxGrayscale}${element.filters.grayscale}${strings.common.symbol_ba5ec51d}` }} />
      </div>;
    }
    case strings.common.chart:return <ChartRenderer element={element} theme={theme}/>;
    case strings.common.table: {
      const totalHeight = element.rows.reduce((sum, row) => sum + row.height, 0);
      const totalWidth = element.columnWidths.reduce((sum, w) => sum + w, 0);
      return <table className={strings.renderer.rendererTable} style={{ fontFamily: `${theme.fonts.body}${strings.renderer.geistVariableSansSerif}`, color: theme.colors.text }}><colgroup>{element.columnWidths.map((w, i) => <col key={i} style={{ width: `${w / totalWidth * 100}${strings.common.symbol_bbf3f11c}` }} />)}</colgroup><tbody>
        {element.rows.map((row, rowIndex) => <tr key={row.id} style={{ height: `${row.height / totalHeight * 100}${strings.common.symbol_bbf3f11c}` }}>{row.cells.map(cell => <td key={cell.id} colSpan={cell.colSpan} rowSpan={cell.rowSpan} style={{ ...fillStyle(rowIndex === 0 && element.style.headerRow ? element.style.headerFill : cell.fill), border: `${element.style.borderWidth}${strings.renderer.pxSolid}${element.style.borderColor}`, backgroundColor: element.style.bandedRows && rowIndex % 2 && cell.fill.type === strings.common.none ? strings.renderer.colorf4f5f7 : undefined, fontWeight: rowIndex === 0 && element.style.headerRow ? 600 : 400 }}>
          <RichText content={cell.content} interactive={interactive} onCommit={content => useEditor.getState().mutate(strings.renderer.editTableCell, draft => {
            const current = draft.slides.flatMap(s => s.elements).find(e => e.id === element.id);
            if (current?.type === strings.common.table) { const target = current.rows.flatMap(r => r.cells).find(c => c.id === cell.id); if (target) target.content = content; }
          })} />
        </td>)}</tr>)}
      </tbody></table>;
    }
    default:{const exhaustive:never=element;throw new Error(`${strings.renderer.unsupportedElement}${String(exhaustive)}`)}
  }
}
const ElementView=memo(function ElementView({element,theme,interactive}:{element:SlideElement;theme:Theme;interactive:boolean}){
  return <div data-element-id={element.id} className={`${strings.renderer.rendererElementRendererElement}${element.type}${element.locked?strings.renderer.rendererElementLocked:strings.common.empty}`} style={{left:element.x,top:element.y,width:element.type===strings.common.line?Math.max(1,element.width):element.width,height:element.type===strings.common.line?Math.max(1,element.height):element.height,opacity:element.opacity,transform:`${strings.common.rotate}${element.rotation}${strings.common.deg}`}}><ElementContent element={element} theme={theme} interactive={interactive&&!element.locked}/></div>;
});
const defaultSize={width:1920,height:1080};
export function SlideRenderer({ slide, theme, width = 1920, interactive = false,logicalSize=defaultSize }: SlideRendererProps) {
  const scale = width / logicalSize.width;
  return <div className={strings.renderer.rendererSlideViewport} style={{ width, height: width * logicalSize.height / logicalSize.width }}>
    <div className={strings.renderer.rendererSlide} style={{ ...fillStyle(slide.background), width: logicalSize.width, height: logicalSize.height, transform: `${strings.common.scale}${scale}${strings.common.symbol_ba5ec51d}`, color: theme.colors.text, fontFamily: `${theme.fonts.body}${strings.renderer.geistVariableSansSerif}` }}>
      {slide.elements.filter(element=>!element.hidden).map(element=><ElementView key={element.id} element={element} theme={theme} interactive={interactive}/>)}
    </div>
  </div>;
}
