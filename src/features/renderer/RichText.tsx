import { Fragment, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import type { TipTapDocument } from '@/types/model';

import TextEditor from './TextEditor';

function renderNode(node: TipTapDocument, key: string): ReactNode {
  if (node.type === 'text') {
    let text: ReactNode = node.text ?? '';
    for (const mark of node.marks ?? []) {
      const attrs = mark.attrs;
      switch (mark.type) {
        case 'bold': text = <strong>{text}</strong>; break;
        case 'italic': text = <em>{text}</em>; break;
        case 'underline': text = <u>{text}</u>; break;
        case 'strike': text = <s>{text}</s>; break;
        case 'code': text = <code>{text}</code>; break;
        case 'highlight': text = <mark style={{ backgroundColor: String(attrs?.color ?? '#fff0a6') }}>{text}</mark>; break;
        case 'textStyle': {
          const style: CSSProperties = {};
          if (attrs?.color) style.color = String(attrs.color);
          if (attrs?.fontFamily) style.fontFamily = String(attrs.fontFamily);
          if (attrs?.fontSize) style.fontSize = String(attrs.fontSize);
          if (attrs?.backgroundColor) style.backgroundColor = String(attrs.backgroundColor);
          if (attrs?.lineHeight) style.lineHeight = String(attrs.lineHeight);
          text = <span style={style}>{text}</span>; break;
        }
        case 'link': {
          const href = String(attrs?.href ?? '');
          text = <a href={/^(https?:|mailto:|tel:|#)/i.test(href) ? href : undefined} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>{text}</a>; break;
        }
      }
    }
    return <Fragment key={key}>{text}</Fragment>;
  }
  const children = node.content?.map((child, i) => renderNode(child, `${key}-${i}`));
  const style: CSSProperties = { textAlign: node.attrs?.textAlign as CSSProperties['textAlign'] };
  switch (node.type) {
    case 'doc': return <Fragment key={key}>{children}</Fragment>;
    case 'hardBreak': return <br key={key} />;
    case 'heading': {
      const level = Math.max(1, Math.min(6, Number(node.attrs?.level ?? 1)));
      return <div key={key} role="heading" aria-level={level} className={`renderer-heading renderer-heading-${level}`} style={style}>{children}</div>;
    }
    case 'bulletList': return <ul key={key}>{children}</ul>;
    case 'orderedList': return <ol key={key} start={Number(node.attrs?.start ?? 1)}>{children}</ol>;
    case 'listItem': return <li key={key}>{children}</li>;
    case 'blockquote': return <blockquote key={key}>{children}</blockquote>;
    case 'codeBlock': return <pre key={key}><code>{children}</code></pre>;
    case 'horizontalRule': return <hr key={key} />;
    default: return <p key={key} style={style}>{children ?? <br />}</p>;
  }
}

export interface RichTextProps { content: TipTapDocument; interactive?: boolean; onCommit?: (content: TipTapDocument) => void; style?: CSSProperties }
export function RichText({ content, interactive = false, onCommit, style }: RichTextProps) {
  const [editing, setEditing] = useState(false);
  const rendered = renderNode(content, 'doc');
  return <div className={`renderer-rich-text${editing ? ' renderer-rich-text-editing' : ''}`} style={style} {...(interactive && !editing ? {
    role: 'button',
    tabIndex: 0,
    'aria-label': 'Edit text',
    onDoubleClick: (event: MouseEvent<HTMLDivElement>) => { event.stopPropagation(); setEditing(true); },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || !['Enter', 'F2', ' '].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation(); setEditing(true);
    },
  } : {})}>
    {editing?<TextEditor content={content} {...(onCommit?{onCommit}:{})} finish={()=>setEditing(false)}/>:rendered}
  </div>;
}
