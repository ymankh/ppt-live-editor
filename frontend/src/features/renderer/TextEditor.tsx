import { EditorContent, useEditor as useTipTap } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { Button } from '@/components/ui/button';
import type { TipTapDocument } from '@/types/model';
import type { RichTextProps } from './RichText';
import { strings } from "@/strings";


const extensions = [StarterKit.configure({ link: { openOnClick: false } }), TextStyleKit, TextAlign.configure({ types: [strings.renderer.heading, strings.common.paragraph] }), Highlight.configure({ multicolor: true })];

export default function TextEditor({ content, onCommit, finish }: RichTextProps & { finish: () => void }) {
  const editor = useTipTap({
    extensions,
    content,
    autofocus: strings.common.end,
    editorProps: {
      handleKeyDown: (view, event) => {
        event.stopPropagation();
        if (event.key !== strings.common.escape) return false;
        event.preventDefault();
        view.dom.blur();
        return true;
      },
    },
  });
  if (!editor) return null;
  return <div className={strings.renderer.rendererEditor} data-editing={strings.common.true} role={strings.common.presentation} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()} onBlur={event => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    const updated = editor.getJSON() as TipTapDocument;
    if (JSON.stringify(updated) !== JSON.stringify(content)) onCommit?.(updated);
    finish();
  }}>
    <div className={strings.renderer.rendererTextToolbar} role={strings.common.toolbar} aria-label={strings.renderer.textFormatting} onPointerDown={event => event.preventDefault()}>
      <Button variant={strings.common.ghost} type={strings.common.button} aria-label={strings.common.bold_94fee62e} aria-pressed={editor.isActive(strings.common.bold)} onClick={() => editor.chain().focus().toggleBold().run()}><b>{strings.renderer.b}</b></Button>
      <Button variant={strings.common.ghost} type={strings.common.button} aria-label={strings.common.italic_9bf37cb5} aria-pressed={editor.isActive(strings.common.italic)} onClick={() => editor.chain().focus().toggleItalic().run()}><i>{strings.common.i}</i></Button>
      <Button variant={strings.common.ghost} type={strings.common.button} aria-label={strings.renderer.underline} aria-pressed={editor.isActive(strings.common.underline)} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>{strings.renderer.u}</u></Button>
      <span />
      <Button variant={strings.common.ghost} type={strings.common.button} aria-label={strings.common.alignLeft} onClick={() => editor.chain().focus().setTextAlign(strings.common.left).run()}>{strings.renderer.symbol_2c672125}</Button>
      <Button variant={strings.common.ghost} type={strings.common.button} aria-label={strings.common.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>{strings.renderer.symbol_e35a6a07}</Button>
    </div>
    <EditorContent editor={editor} />
  </div>;
}
