const escapes:Record<string,string>={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
export function notesHtml(source:string):string{
 const html=source.includes('<')?source:`<p>${source.replace(/[&<>"]/g,c=>escapes[c]??c).replace(/\n/g,'<br>')}</p>`;
 const document=new DOMParser().parseFromString(html,'text/html');
 const allowed:Record<string,true>={P:true,BR:true,STRONG:true,EM:true,U:true,S:true,UL:true,OL:true,LI:true,BLOCKQUOTE:true};
 for(const element of Array.from(document.body.querySelectorAll('*')).reverse()){
  if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED'].includes(element.tagName)){element.remove();continue}
  if(!allowed[element.tagName]){element.replaceWith(...Array.from(element.childNodes));continue}
  for(const attribute of Array.from(element.attributes))element.removeAttribute(attribute.name);
 }
 return document.body.innerHTML;
}
export function notesText(source:string):string{
 if(!source.includes('<'))return source;
 const document=new DOMParser().parseFromString(notesHtml(source),'text/html');
 document.body.querySelectorAll('p,li,br').forEach(element=>element.append('\n'));
 return document.body.textContent?.trim()??'';
}
