import { EditorContent, useEditor as useTipTap } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { Button } from '@/components/ui/button';
import type { TipTapDocument } from '@/types/model';
import type { RichTextProps } from './RichText';

const extensions = [StarterKit.configure({ link: { openOnClick: false } }), TextStyleKit, TextAlign.configure({ types: ['heading', 'paragraph'] }), Highlight.configure({ multicolor: true })];

export default function TextEditor({ content, onCommit, finish }: RichTextProps & { finish: () => void }) {
  const editor = useTipTap({
    extensions,
    content,
    autofocus: 'end',
    editorProps: {
      handleKeyDown: (view, event) => {
        event.stopPropagation();
        if (event.key !== 'Escape') return false;
        event.preventDefault();
        view.dom.blur();
        return true;
      },
    },
  });
  if (!editor) return null;
  return <div className="renderer-editor" data-editing="true" role="presentation" onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()} onBlur={event => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    const updated = editor.getJSON() as TipTapDocument;
    if (JSON.stringify(updated) !== JSON.stringify(content)) onCommit?.(updated);
    finish();
  }}>
    <div className="renderer-text-toolbar" role="toolbar" aria-label="Text formatting" onPointerDown={event => event.preventDefault()}>
      <Button variant="ghost" type="button" aria-label="Bold" aria-pressed={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></Button>
      <Button variant="ghost" type="button" aria-label="Italic" aria-pressed={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></Button>
      <Button variant="ghost" type="button" aria-label="Underline" aria-pressed={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></Button>
      <span />
      <Button variant="ghost" type="button" aria-label="Align left" onClick={() => editor.chain().focus().setTextAlign('left').run()}>≡</Button>
      <Button variant="ghost" type="button" aria-label="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}>•≡</Button>
    </div>
    <EditorContent editor={editor} />
  </div>;
}
