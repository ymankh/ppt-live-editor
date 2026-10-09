import { useEffect,useRef } from 'react';
import { EditorContent,useEditor as useTextEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold,Italic,List,ListOrdered } from 'lucide-react';
import { useEditor } from '@/store/editor';
import { notesHtml } from './notes';
import { strings } from "@/strings";

const extensions=[StarterKit];
export function NotesEditor({slideId,value}:{slideId:string;value:string}){
 const dirty=useRef(false);const source=useRef({slideId,value});source.current={slideId,value};
 const editor=useTextEditor({extensions,content:notesHtml(value),editorProps:{attributes:{class:strings.text.notesTiptap,[strings.common.ariaLabel]:strings.common.notes,role:strings.text.textbox,[strings.text.ariaMultiline]:strings.common.true}},onUpdate:()=>{dirty.current=true},onBlur:({editor:instance})=>{if(!dirty.current)return;dirty.current=false;const id=source.current.slideId;const html=instance.getHTML();useEditor.getState().mutate(strings.text.editSpeakerNotes,draft=>{const slide=draft.slides.find(item=>item.id===id);if(slide)slide.notes=html})}});
 useEffect(()=>{if(editor&&!editor.isFocused){editor.commands.setContent(notesHtml(value),{emitUpdate:false});dirty.current=false}},[editor,slideId,value]);
 return <div className={strings.text.notesEditor}><EditorContent editor={editor}/>{editor&&<div className={strings.text.notesFormatting}><button aria-label={strings.text.boldNotes} title={strings.common.bold_94fee62e} onPointerDown={event=>event.preventDefault()} onClick={()=>editor.chain().focus().toggleBold().run()}><Bold size={13}/></button><button aria-label={strings.text.italicNotes} title={strings.common.italic_9bf37cb5} onPointerDown={event=>event.preventDefault()} onClick={()=>editor.chain().focus().toggleItalic().run()}><Italic size={13}/></button><button aria-label={strings.text.bulletedNotes} title={strings.common.bulletList} onPointerDown={event=>event.preventDefault()} onClick={()=>editor.chain().focus().toggleBulletList().run()}><List size={13}/></button><button aria-label={strings.text.numberedNotes} title={strings.text.numberedList} onPointerDown={event=>event.preventDefault()} onClick={()=>editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={13}/></button></div>}</div>;
}
export function NotesContent({value}:{value:string}){return <div className={strings.text.notesContent} dangerouslySetInnerHTML={{__html:notesHtml(value)}}/>}
