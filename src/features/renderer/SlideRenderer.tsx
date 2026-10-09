import { memo,useId, type CSSProperties } from 'react';
import type { ArrowHead, Fill, Shadow, Slide, SlideElement, Stroke, Theme } from '@/types/model';
import { useEditor } from '@/store/editor';
import { shapePath } from '@/lib/geometry';
import { RichText } from './RichText';
import { ChartRenderer } from './ChartRenderer';
import './renderer.css';

export interface SlideRendererProps { slide: Slide; theme: Theme; width?: number; interactive?: boolean; logicalSize?:{width:number;height:number} }
export function fillStyle(fill: Fill): CSSProperties {
  switch (fill.type) {
    case 'none': return { background: 'transparent' };
    case 'solid': return { background: fill.color };
    case 'image': return { backgroundImage: `url(${JSON.stringify(fill.assetId)})`, backgroundSize: fill.fit === 'tile' ? 'auto' : fill.fit, backgroundRepeat: fill.fit === 'tile' ? 'repeat' : 'no-repeat', backgroundPosition: 'center' };
    case 'gradient': {
      const stops = fill.gradient.stops.map(s => `${s.color} ${s.offset * 100}%`).join(', ');
      return { background: fill.gradient.kind === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${fill.gradient.angle}deg, ${stops})` };
    }
  }
}
function decorationStyle(stroke: Stroke | null, shadow: Shadow | null): CSSProperties {
  return { border: stroke ? `${stroke.width}px ${stroke.style} ${stroke.color}` : undefined, boxShadow: shadow ? `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}` : undefined };
}
function SvgFill({ fill, id }: { fill: Fill; id: string }) {
  if (fill.type === 'gradient') {
    const stops = fill.gradient.stops.map((s, i) => <stop key={i} offset={`${s.offset * 100}%`} stopColor={s.color} />);
    if (fill.gradient.kind === 'radial') return <radialGradient id={id}>{stops}</radialGradient>;
    const angle = fill.gradient.angle * Math.PI / 180;
    return <linearGradient id={id} x1={`${50 - Math.sin(angle) * 50}%`} y1={`${50 + Math.cos(angle) * 50}%`} x2={`${50 + Math.sin(angle) * 50}%`} y2={`${50 - Math.cos(angle) * 50}%`}>{stops}</linearGradient>;
  }
  if (fill.type === 'image') return <pattern id={id} width="1" height="1" patternContentUnits="objectBoundingBox"><image href={fill.assetId} width="1" height="1" preserveAspectRatio={fill.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'} /></pattern>;
  return null;
}
function ArrowMarker({ head, id, color }: { head: ArrowHead; id: string; color: string }) {
  if (head === 'none') return null;
  return <marker id={id} viewBox="0 0 12 12" refX="10" refY="6" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
    {head === 'circle' ? <circle cx="6" cy="6" r="4" fill={color} /> : head === 'diamond' ? <path d="M0 6 L6 0 12 6 6 12 Z" fill={color} /> : head === 'bar' ? <path d="M8 0 V12" stroke={color} strokeWidth="2" /> : <path d="M1 1 L10 6 1 11" fill={head === 'triangle' ? color : 'none'} stroke={color} strokeWidth="2" />}
  </marker>;
}
function ElementContent({ element, theme, interactive }: { element: SlideElement; theme: Theme; interactive: boolean }) {
  const id = useId().replace(/:/g, '');
  const commit = (content: Parameters<typeof RichText>[0]['content']) => {
    useEditor.getState().mutate('Edit text', draft => {
      const current = draft.slides.flatMap(s => s.elements).find(e => e.id === element.id);
      if (current?.type === 'text') current.content = content;
      if (current?.type === 'shape') current.text = content;
    });
  };
  switch (element.type) {
    case 'text': return <div className="renderer-text-frame" style={{ ...fillStyle(element.fill), ...decorationStyle(element.stroke, element.shadow), borderRadius: element.cornerRadius, padding: element.padding, justifyContent: element.verticalAlign === 'middle' ? 'center' : element.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start' }}>
      <RichText content={element.content} interactive={interactive} onCommit={commit} style={{ fontFamily: `${element.fontFamily || theme.fonts.body}, 'Geist Variable', sans-serif`, fontSize: element.fontSize, color: element.color || theme.colors.text, fontWeight: element.bold ? 700 : 400, fontStyle: element.italic ? 'italic' : 'normal', textAlign: element.align, letterSpacing: element.letterSpacing }} />
    </div>;
    case 'shape': {
      const fill = element.fill.type === 'solid' ? element.fill.color : element.fill.type === 'none' ? 'none' : `url(#${id}-fill)`;
      return <div className="renderer-shape-frame">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible', filter: element.shadow ? `drop-shadow(${element.shadow.offsetX}px ${element.shadow.offsetY}px ${element.shadow.blur}px ${element.shadow.color})` : undefined, transform: `scale(${element.flipH ? -1 : 1}, ${element.flipV ? -1 : 1})` }}>
          <defs><SvgFill fill={element.fill} id={`${id}-fill`} /></defs>
          <path d={shapePath(element.shape, element.cornerRadius / Math.max(1, Math.min(element.width, element.height)) * 100)} fill={fill} stroke={element.stroke?.color ?? 'none'} strokeWidth={element.stroke?.width ?? 0} vectorEffect="non-scaling-stroke" strokeDasharray={element.stroke?.style === 'dashed' ? '12 8' : element.stroke?.style === 'dotted' ? '2 6' : undefined} />
        </svg>
        {element.text && <div className="renderer-shape-text" style={{ justifyContent: element.textVerticalAlign === 'middle' ? 'center' : element.textVerticalAlign === 'bottom' ? 'flex-end' : 'flex-start', color: theme.colors.text, fontFamily: `${theme.fonts.body}, 'Geist Variable', sans-serif` }}><RichText content={element.text} interactive={interactive} onCommit={commit} /></div>}
      </div>;
    }
    case 'line': {
      const { start, end, curve, stroke } = element;
      const path = curve === 'straight' ? `M${start.x} ${start.y} L${end.x} ${end.y}` : curve === 'elbow' ? `M${start.x} ${start.y} H${(start.x + end.x) / 2} V${end.y} H${end.x}` : `M${start.x} ${start.y} C${(start.x + end.x) / 2} ${start.y}, ${(start.x + end.x) / 2} ${end.y}, ${end.x} ${end.y}`;
      return <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(1, element.width)} ${Math.max(1, element.height)}`} className="renderer-line"><defs><ArrowMarker head={element.startArrow} id={`${id}-start`} color={stroke.color} /><ArrowMarker head={element.endArrow} id={`${id}-end`} color={stroke.color} /></defs><path d={path} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeDasharray={stroke.style === 'dashed' ? '16 10' : stroke.style === 'dotted' ? '2 8' : undefined} markerStart={element.startArrow === 'none' ? undefined : `url(#${id}-start)`} markerEnd={element.endArrow === 'none' ? undefined : `url(#${id}-end)`} /></svg>;
    }
    case 'image': {
      const cropWidth = Math.max(0.001, element.crop.width), cropHeight = Math.max(0.001, element.crop.height);
      return <div className="renderer-image-frame" style={{ ...decorationStyle(element.stroke, element.shadow), borderRadius: element.clipShape === 'ellipse' ? '50%' : element.cornerRadius, overflow: 'hidden' }}>
        <img draggable={false} src={element.assetId} alt={element.name} style={{ width: `${100 / cropWidth}%`, height: `${100 / cropHeight}%`, maxWidth: 'none', position: 'absolute', left: `${-element.crop.x / cropWidth * 100}%`, top: `${-element.crop.y / cropHeight * 100}%`, objectFit: 'cover', transform: `scale(${element.flipH ? -1 : 1}, ${element.flipV ? -1 : 1})`, filter: `brightness(${element.filters.brightness}) contrast(${element.filters.contrast}) saturate(${element.filters.saturation}) blur(${element.filters.blur}px) grayscale(${element.filters.grayscale})` }} />
      </div>;
    }
    case 'chart':return <ChartRenderer element={element} theme={theme}/>;
    case 'table': {
      const totalHeight = element.rows.reduce((sum, row) => sum + row.height, 0);
      const totalWidth = element.columnWidths.reduce((sum, w) => sum + w, 0);
      return <table className="renderer-table" style={{ fontFamily: `${theme.fonts.body}, 'Geist Variable', sans-serif`, color: theme.colors.text }}><colgroup>{element.columnWidths.map((w, i) => <col key={i} style={{ width: `${w / totalWidth * 100}%` }} />)}</colgroup><tbody>
        {element.rows.map((row, rowIndex) => <tr key={row.id} style={{ height: `${row.height / totalHeight * 100}%` }}>{row.cells.map(cell => <td key={cell.id} colSpan={cell.colSpan} rowSpan={cell.rowSpan} style={{ ...fillStyle(rowIndex === 0 && element.style.headerRow ? element.style.headerFill : cell.fill), border: `${element.style.borderWidth}px solid ${element.style.borderColor}`, backgroundColor: element.style.bandedRows && rowIndex % 2 && cell.fill.type === 'none' ? '#f4f5f7' : undefined, fontWeight: rowIndex === 0 && element.style.headerRow ? 600 : 400 }}>
          <RichText content={cell.content} interactive={interactive} onCommit={content => useEditor.getState().mutate('Edit table cell', draft => {
            const current = draft.slides.flatMap(s => s.elements).find(e => e.id === element.id);
            if (current?.type === 'table') { const target = current.rows.flatMap(r => r.cells).find(c => c.id === cell.id); if (target) target.content = content; }
          })} />
        </td>)}</tr>)}
      </tbody></table>;
    }
    default:{const exhaustive:never=element;throw new Error(`Unsupported element: ${String(exhaustive)}`)}
  }
}
const ElementView=memo(function ElementView({element,theme,interactive}:{element:SlideElement;theme:Theme;interactive:boolean}){
  return <div data-element-id={element.id} className={`renderer-element renderer-element-${element.type}${element.locked?' renderer-element-locked':''}`} style={{left:element.x,top:element.y,width:element.type==='line'?Math.max(1,element.width):element.width,height:element.type==='line'?Math.max(1,element.height):element.height,opacity:element.opacity,transform:`rotate(${element.rotation}deg)`}}><ElementContent element={element} theme={theme} interactive={interactive&&!element.locked}/></div>;
});
const defaultSize={width:1920,height:1080};
export function SlideRenderer({ slide, theme, width = 1920, interactive = false,logicalSize=defaultSize }: SlideRendererProps) {
  const scale = width / logicalSize.width;
  return <div className="renderer-slide-viewport" style={{ width, height: width * logicalSize.height / logicalSize.width }}>
    <div className="renderer-slide" style={{ ...fillStyle(slide.background), width: logicalSize.width, height: logicalSize.height, transform: `scale(${scale})`, color: theme.colors.text, fontFamily: `${theme.fonts.body}, 'Geist Variable', sans-serif` }}>
      {slide.elements.filter(element=>!element.hidden).map(element=><ElementView key={element.id} element={element} theme={theme} interactive={interactive}/>)}
    </div>
  </div>;
}
