import { useTranslation } from '@/features/localization/locale';
import { ContextMenu,ContextMenuTrigger,ContextMenuContent,ContextMenuItem,ContextMenuSeparator,ContextMenuShortcut } from '@/components/ui/context-menu';
import { commands,isEnabled } from '@/features/commands/registry';
import { useEditor } from '@/store/editor';
import { SlideCanvas } from './SlideCanvas';
import { strings } from "@/strings";
import { formatShortcut } from '@/lib/shortcuts';

const contextGroups=[[strings.common.cut,strings.common.copy,strings.common.paste,strings.common.pastePlace,strings.common.duplicate,strings.common.delete],[strings.common.front,strings.common.back,strings.common.group,strings.common.ungroup,strings.common.lock],[strings.common.text,strings.common.rectangle,strings.common.ellipse,strings.common.chart,strings.common.table,strings.common.slide]] as const;
export function CanvasContextMenu(){
  const t = useTranslation();
 useEditor(s=>s.selection);
 return <ContextMenu><ContextMenuTrigger className={strings.canvas.canvasContextTrigger} render={<div/>}><SlideCanvas/></ContextMenuTrigger><ContextMenuContent>{contextGroups.map((group,index)=><div key={index}>{index>0&&<ContextMenuSeparator/>}{group.map(id=>{const command=commands.find(c=>c.id===id);if(!command)return null;return <ContextMenuItem key={id} disabled={!isEnabled(command)} onClick={command.run}>{t(command.label)}<ContextMenuShortcut>{formatShortcut(command.shortcut)}</ContextMenuShortcut></ContextMenuItem>})}</div>)}</ContextMenuContent></ContextMenu>;
}
