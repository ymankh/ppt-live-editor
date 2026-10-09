import { ContextMenu,ContextMenuTrigger,ContextMenuContent,ContextMenuItem,ContextMenuSeparator,ContextMenuShortcut } from '@/components/ui/context-menu';
import { commands,isEnabled } from '@/features/commands/registry';
import { useEditor } from '@/store/editor';
import { SlideCanvas } from './SlideCanvas';
const contextGroups=[['cut','copy','paste','paste-place','duplicate','delete'],['front','back','group','ungroup','lock'],['text','rectangle','ellipse','chart','table','slide']] as const;
export function CanvasContextMenu(){
 useEditor(s=>s.selection);
 return <ContextMenu><ContextMenuTrigger className="canvas-context-trigger" render={<div/>}><SlideCanvas/></ContextMenuTrigger><ContextMenuContent>{contextGroups.map((group,index)=><div key={index}>{index>0&&<ContextMenuSeparator/>}{group.map(id=>{const command=commands.find(c=>c.id===id);if(!command)return null;return <ContextMenuItem key={id} disabled={!isEnabled(command)} onClick={command.run}>{command.label}<ContextMenuShortcut>{command.shortcut?.replace('Ctrl','⌘')}</ContextMenuShortcut></ContextMenuItem>})}</div>)}</ContextMenuContent></ContextMenu>;
}
