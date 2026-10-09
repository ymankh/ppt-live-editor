import { useEffect,useRef } from 'react';
import { EditorContent,useEditor as useTextEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold,Italic,List,ListOrdered } from 'lucide-react';
import { useEditor } from '@/store/editor';
import { notesHtml } from './notes';
const extensions=[StarterKit];
export function NotesEditor({slideId,value}:{slideId:string;value:string}){
 const dirty=useRef(false);const source=useRef({slideId,value});source.current={slideId,value};
 const editor=useTextEditor({extensions,content:notesHtml(value),editorProps:{attributes:{class:'notes-tiptap','aria-label':'Speaker notes',role:'textbox','aria-multiline':'true'}},onUpdate:()=>{dirty.current=true},onBlur:({editor:instance})=>{if(!dirty.current)return;dirty.current=false;const id=source.current.slideId;const html=instance.getHTML();useEditor.getState().mutate('Edit speaker notes',draft=>{const slide=draft.slides.find(item=>item.id===id);if(slide)slide.notes=html})}});
 useEffect(()=>{if(editor&&!editor.isFocused){editor.commands.setContent(notesHtml(value),{emitUpdate:false});dirty.current=false}},[editor,slideId,value]);
 return <div className="notes-editor"><EditorContent editor={editor}/>{editor&&<div className="notes-formatting"><button aria-label="Bold notes" title="Bold" onPointerDown={event=>event.preventDefault()} onClick={()=>editor.chain().focus().toggleBold().run()}><Bold size={13}/></button><button aria-label="Italic notes" title="Italic" onPointerDown={event=>event.preventDefault()} onClick={()=>editor.chain().focus().toggleItalic().run()}><Italic size={13}/></button><button aria-label="Bulleted notes" title="Bullet list" onPointerDown={event=>event.preventDefault()} onClick={()=>editor.chain().focus().toggleBulletList().run()}><List size={13}/></button><button aria-label="Numbered notes" title="Numbered list" onPointerDown={event=>event.preventDefault()} onClick={()=>editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={13}/></button></div>}</div>;
}
export function NotesContent({value}:{value:string}){return <div className="notes-content" dangerouslySetInnerHTML={{__html:notesHtml(value)}}/>}
