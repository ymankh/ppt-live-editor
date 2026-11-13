
import { strings } from "@/strings";
const escapes:Record<string,string>={[strings.text.symbol_951dcee3]:strings.text.amp,[strings.text.symbol_dabd3aff]:strings.text.lt,[strings.text.symbol_62b67e1f]:strings.text.gt,[strings.text.symbol]:strings.text.quot};
export function notesHtml(source:string):string{
 const html=source.includes(strings.text.symbol_dabd3aff)?source:`${strings.text.p_33f27994}${source.replace(/[&<>"]/g,c=>escapes[c]??c).replace(/\n/g,strings.text.br)}${strings.text.p}`;
 const document=new DOMParser().parseFromString(html,strings.text.textHtml);
 const allowed:Record<string,true>={P:true,BR:true,STRONG:true,EM:true,U:true,S:true,UL:true,OL:true,LI:true,BLOCKQUOTE:true};
 for(const element of Array.from(document.body.querySelectorAll(strings.common.symbol_684888c0)).reverse()){
  if(([strings.text.sCRIPT, strings.text.sTYLE, strings.text.iFRAME, strings.text.oBJECT, strings.text.eMBED] as readonly string[]).includes(element.tagName)){element.remove();continue}
  if(!allowed[element.tagName]){
   // Block structure the notes do not keep (headings, code blocks from older notes or pasted HTML)
   // becomes paragraphs. Unwrapping it inline would run separate lines together into one.
   if(/^(H[1-6]|PRE)$/.test(element.tagName)){
    const paragraph=document.createElement('p');paragraph.setAttribute('dir','auto');
    for(const node of Array.from(element.childNodes)){
     if(element.tagName!=='PRE'||node.nodeType!==Node.TEXT_NODE){paragraph.append(node);continue}
     (node.textContent??'').split('\n').forEach((line,index)=>{if(index>0)paragraph.append(document.createElement('br'));paragraph.append(line)});
    }
    element.replaceWith(paragraph);
   }else element.replaceWith(...Array.from(element.childNodes));
   continue;
  }
  for(const attribute of Array.from(element.attributes))element.removeAttribute(attribute.name);
  if (['P', 'LI', 'BLOCKQUOTE'].includes(element.tagName)) element.setAttribute('dir', 'auto');
 }
 return document.body.innerHTML;
}
export function notesText(source:string):string{
 if(!source.includes(strings.text.symbol_dabd3aff))return source;
 const document=new DOMParser().parseFromString(notesHtml(source),strings.text.textHtml);
 document.body.querySelectorAll(strings.text.pLiBr).forEach(element=>element.append(strings.common.newline));
 return document.body.textContent?.trim()??strings.common.empty;
}
