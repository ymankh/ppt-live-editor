import { Fragment, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import type { TipTapDocument } from '@/types/model';

import TextEditor from './TextEditor';
import { strings } from "@/strings";


function renderNode(node: TipTapDocument, key: string): ReactNode {
  if (node.type === strings.common.text) {
    let text: ReactNode = node.text ?? strings.common.empty;
    for (const mark of node.marks ?? []) {
      const attrs = mark.attrs;
      switch (mark.type) {
        case strings.common.bold: text = <strong>{text}</strong>; break;
        case strings.common.italic: text = <em>{text}</em>; break;
        case strings.common.underline: text = <u>{text}</u>; break;
        case strings.common.strike: text = <s>{text}</s>; break;
        case strings.renderer.code: text = <code>{text}</code>; break;
        case strings.renderer.highlight: text = <mark style={{ backgroundColor: String(attrs?.color ?? strings.renderer.colorfff0a6) }}>{text}</mark>; break;
        case strings.common.textStyle: {
          const style: CSSProperties = {};
          if (attrs?.color) style.color = String(attrs.color);
          if (attrs?.fontFamily) style.fontFamily = String(attrs.fontFamily);
          if (attrs?.fontSize) style.fontSize = String(attrs.fontSize);
          if (attrs?.backgroundColor) style.backgroundColor = String(attrs.backgroundColor);
          if (attrs?.lineHeight) style.lineHeight = String(attrs.lineHeight);
          text = <span style={style}>{text}</span>; break;
        }
        case strings.common.link: {
          const href = String(attrs?.href ?? strings.common.empty);
          text = <a href={/^(https?:|mailto:|tel:|#)/i.test(href) ? href : undefined} target={strings.common.blank} rel={strings.renderer.noreferrer} onClick={event => event.stopPropagation()}>{text}</a>; break;
        }
      }
    }
    return <Fragment key={key}>{text}</Fragment>;
  }
  const children = node.content?.map((child, i) => renderNode(child, `${key}${strings.common.symbol_3973e022}${i}`));
  const style: CSSProperties = { textAlign: node.attrs?.textAlign as CSSProperties['textAlign'] };
  switch (node.type) {
    case strings.common.doc: return <Fragment key={key}>{children}</Fragment>;
    case strings.common.hardBreak: return <br key={key} />;
    case strings.renderer.heading: {
      const level = Math.max(1, Math.min(6, Number(node.attrs?.level ?? 1)));
      return <div key={key} role={strings.renderer.heading} aria-level={level} className={`${strings.renderer.rendererHeadingRendererHeading}${level}`} style={style}>{children}</div>;
    }
    case strings.renderer.bulletList: return <ul key={key}>{children}</ul>;
    case strings.renderer.orderedList: return <ol key={key} start={Number(node.attrs?.start ?? 1)}>{children}</ol>;
    case strings.renderer.listItem: return <li key={key}>{children}</li>;
    case strings.renderer.blockquote: return <blockquote key={key}>{children}</blockquote>;
    case strings.renderer.codeBlock: return <pre key={key}><code>{children}</code></pre>;
    case strings.renderer.horizontalRule: return <hr key={key} />;
    default: return <p key={key} style={style}>{children ?? <br />}</p>;
  }
}

export interface RichTextProps { content: TipTapDocument; interactive?: boolean; onCommit?: (content: TipTapDocument) => void; style?: CSSProperties }
export function RichText({ content, interactive = false, onCommit, style }: RichTextProps) {
  const [editing, setEditing] = useState(false);
  const rendered = renderNode(content, strings.common.doc);
  return <div className={`${strings.renderer.rendererRichText}${editing ? strings.renderer.rendererRichTextEditing : strings.common.empty}`} style={style} {...(interactive && !editing ? {
    role: strings.common.button,
    tabIndex: 0,
    [strings.common.ariaLabel]: strings.renderer.editText,
    onDoubleClick: (event: MouseEvent<HTMLDivElement>) => { event.stopPropagation(); setEditing(true); },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || !([strings.common.enter, strings.common.f2, strings.common.space] as readonly string[]).includes(event.key)) return;
      event.preventDefault(); event.stopPropagation(); setEditing(true);
    },
  } : {})}>
    {editing?<TextEditor content={content} {...(onCommit?{onCommit}:{})} finish={()=>setEditing(false)}/>:rendered}
  </div>;
}
