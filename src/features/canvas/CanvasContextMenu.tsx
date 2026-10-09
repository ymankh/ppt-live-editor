import { ContextMenu,ContextMenuTrigger,ContextMenuContent,ContextMenuItem,ContextMenuSeparator,ContextMenuShortcut } from '@/components/ui/context-menu';
import { commands,isEnabled } from '@/features/commands/registry';
import { useEditor } from '@/store/editor';
import { SlideCanvas } from './SlideCanvas';
import { strings } from "@/strings";

const contextGroups=[[strings.common.cut,strings.common.copy,strings.common.paste,strings.common.pastePlace,strings.common.duplicate,strings.common.delete],[strings.common.front,strings.common.back,strings.common.group,strings.common.ungroup,strings.common.lock],[strings.common.text,strings.common.rectangle,strings.common.ellipse,strings.common.chart,strings.common.table,strings.common.slide]] as const;
export function CanvasContextMenu(){
 useEditor(s=>s.selection);
 return <ContextMenu><ContextMenuTrigger className={strings.canvas.canvasContextTrigger} render={<div/>}><SlideCanvas/></ContextMenuTrigger><ContextMenuContent>{contextGroups.map((group,index)=><div key={index}>{index>0&&<ContextMenuSeparator/>}{group.map(id=>{const command=commands.find(c=>c.id===id);if(!command)return null;return <ContextMenuItem key={id} disabled={!isEnabled(command)} onClick={command.run}>{command.label}<ContextMenuShortcut>{command.shortcut?.replace(strings.common.ctrl,strings.common.symbol_70b4b62a)}</ContextMenuShortcut></ContextMenuItem>})}</div>)}</ContextMenuContent></ContextMenu>;
}
