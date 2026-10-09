import { useEditor } from "@/store/editor";
import { useView } from '@/store/view';
export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  aliases?: string[];
  menu: string;
  selection?: boolean;
  run: () => void;
}
const s = () => useEditor.getState();
export const commands: Command[] = [
  {
    id: "undo",
    label: "Undo",
    shortcut: "Ctrl+Z",
    menu: "Edit",
    run: () => s().undo(),
  },
  {
    id: "redo",
    label: "Redo",
    shortcut: "Ctrl+Shift+Z",
    aliases:['Ctrl+Y'],
    menu: "Edit",
    run: () => s().redo(),
  },
  {
    id: "copy",
    label: "Copy",
    shortcut: "Ctrl+C",
    menu: "Edit",
    selection: true,
    run: () => {
      s().copySelection();
    },
  },
  {
    id: "cut",
    label: "Cut",
    shortcut: "Ctrl+X",
    menu: "Edit",
    selection: true,
    run: () => {
      s().cutSelection();
    },
  },
  {
    id: "paste",
    label: "Paste",
    shortcut: "Ctrl+V",
    menu: "Edit",
    run: () => {
      s().pasteClipboard();
    },
  },
  {
    id: "duplicate",
    label: "Duplicate",
    shortcut: "Ctrl+D",
    menu: "Edit",
    selection: true,
    run: () => s().duplicateSelection(),
  },
  {
    id: "delete",
    label: "Delete",
    shortcut: "Delete",
    menu: "Edit",
    selection: true,
    run: () => s().deleteSelection(),
  },
  {
    id: "select-all",
    label: "Select all",
    shortcut: "Ctrl+A",
    menu: "Edit",
    run: () =>
      s().select(
        s()
          .document.slides.find((x) => x.id === s().activeSlideId)
          ?.elements.map((x) => x.id) ?? [],
      ),
  },
  {
    id: "slide",
    label: "New slide",
    shortcut: "Ctrl+M",
    menu: "Slide",
    run: () => s().addSlide(),
  },
  {
    id: "text",
    label: "Text box",
    shortcut: "T",
    menu: "Insert",
    run: () => s().insert("text"),
  },
  {
    id: "rectangle",
    label: "Rectangle",
    shortcut: "R",
    menu: "Insert",
    run: () => s().insert("shape", "rect"),
  },
  {
    id: "ellipse",
    label: "Ellipse",
    shortcut: "O",
    menu: "Insert",
    run: () => s().insert("shape", "ellipse"),
  },
  {
    id: "line",
    label: "Line",
    shortcut: "L",
    menu: "Insert",
    run: () => s().insert("line"),
  },
  {
    id: "table",
    label: "Table",
    menu: "Insert",
    run: () => s().insert("table"),
  },
  {
    id: "chart",
    label: "Chart",
    menu: "Insert",
    run: () => s().insert("chart"),
  },
  {
    id: "front",
    label: "Bring to front",
    shortcut: "Ctrl+Shift+]",
    menu: "Arrange",
    selection: true,
    run: () => s().arrange("front"),
  },
  {
    id: "back",
    label: "Send to back",
    shortcut: "Ctrl+Shift+[",
    menu: "Arrange",
    selection: true,
    run: () => s().arrange("back"),
  },
  {
    id: "forward",
    label: "Bring forward",
    shortcut: "Ctrl+]",
    menu: "Arrange",
    selection: true,
    run: () => s().arrange("forward"),
  },
  {
    id: "backward",
    label: "Send backward",
    shortcut: "Ctrl+[",
    menu: "Arrange",
    selection: true,
    run: () => s().arrange("backward"),
  },
  {
    id: "group",
    label: "Group",
    shortcut: "Ctrl+G",
    menu: "Arrange",
    selection: true,
    run: () => {
      const groupId = crypto.randomUUID();
      s().mutate("Group", (d) => {
        d.slides
          .find((x) => x.id === s().activeSlideId)
          ?.elements.forEach((e) => {
            if (s().selection.includes(e.id)) e.groupId = groupId;
          });
      });
    },
  },
  {
    id: "ungroup",
    label: "Ungroup",
    shortcut: "Ctrl+Shift+G",
    menu: "Arrange",
    selection: true,
    run: () =>
      s().mutate("Ungroup", (d) => {
        d.slides
          .find((x) => x.id === s().activeSlideId)
          ?.elements.forEach((e) => {
            if (s().selection.includes(e.id)) delete e.groupId;
          });
      }),
  },
  {
    id: "lock",
    label: "Lock / unlock",
    shortcut: "Ctrl+L",
    menu: "Arrange",
    selection: true,
    run: () =>
      s().mutate("Lock", (d) => {
        d.slides
          .find((x) => x.id === s().activeSlideId)
          ?.elements.forEach((e) => {
            if (s().selection.includes(e.id)) e.locked = !e.locked;
          });
      }),
  },
  ...(["left", "center", "right", "top", "middle", "bottom"] as const).map(
    (position) => ({
      id: "align-" + position,
      label: "Align " + position,
      menu: "Arrange",
      selection: true,
      run: () => s().arrange(position),
    }),
  ),
  {
    id: "zoom-in",
    label: "Zoom in",
    shortcut: "Ctrl+=",
    menu: "View",
    run: () => s().setZoom(Math.min(4, s().zoom + 0.1)),
  },
  {
    id: "zoom-out",
    label: "Zoom out",
    shortcut: "Ctrl+-",
    menu: "View",
    run: () => s().setZoom(Math.max(0.25, s().zoom - 0.1)),
  },
  {
    id: "fit",
    label: "Fit to screen",
    shortcut: "Ctrl+0",
    menu: "View",
    run: () => s().setZoom(1),
  },
  {
    id: "save",
    label: "Save presentation",
    shortcut: "Ctrl+S",
    menu: "File",
    run: () => {
      void s().saveProject();
    },
  },
  {id:'select-tool',label:'Selection tool',shortcut:'V',menu:'Insert',run:()=>s().setTool('select')},
  {id:'image',label:'Upload image',shortcut:'I',menu:'Insert',run:()=>window.document.querySelector<HTMLButtonElement>('[aria-label="Upload image"]')?.click()},
  {id:'paste-place',label:'Paste in place',shortcut:'Ctrl+Shift+V',menu:'Edit',run:()=>s().pasteClipboard('in-place')},
  {id:'grid',label:'Toggle grid',shortcut:"Ctrl+'",menu:'View',run:()=>useView.getState().toggleGrid()},
  {id:'rulers',label:'Toggle rulers',shortcut:'Ctrl+R',menu:'View',run:()=>useView.getState().toggleRulers()},
  {id:'snap',label:'Toggle snapping',shortcut:'Ctrl+;',menu:'View',run:()=>useView.getState().toggleSnap()},
  {id:'actual-size',label:'100% zoom',shortcut:'Ctrl+1',menu:'View',run:()=>s().setZoom(1)},
  {id:'distribute-h',label:'Distribute horizontally',menu:'Arrange',selection:true,run:()=>s().distribute('horizontal')},
  {id:'distribute-v',label:'Distribute vertically',menu:'Arrange',selection:true,run:()=>s().distribute('vertical')},
  {id:'match-width',label:'Match width',menu:'Arrange',selection:true,run:()=>s().matchSize('width')},
  {id:'match-height',label:'Match height',menu:'Arrange',selection:true,run:()=>s().matchSize('height')},
  {id:'match-size',label:'Match size',menu:'Arrange',selection:true,run:()=>s().matchSize('both')},
  {id:'flip-h',label:'Flip horizontally',menu:'Arrange',selection:true,run:()=>s().flip('horizontal')},
  {id:'flip-v',label:'Flip vertically',menu:'Arrange',selection:true,run:()=>s().flip('vertical')},
];
export function isEnabled(command: Command): boolean {
  const state=s();
  if(command.id==='undo')return state.past.length>0;
  if(command.id==='redo')return state.future.length>0;
  if(command.id==='group'||command.id.startsWith('match-'))return state.selection.length>1;
  if(command.id.startsWith('distribute-'))return state.selection.length>2;
  return !command.selection || state.selection.length > 0;
}
export function normalizeShortcut(event: KeyboardEvent): string {
  const punctuation:Record<string,string>={BracketLeft:'[',BracketRight:']',Equal:'=',Minus:'-',Quote:"'",Semicolon:';'};
  const key = punctuation[event.code]??(event.key.length === 1 ? event.key.toUpperCase() : event.key);
  const shift=event.shiftKey&&event.code!=='Equal';
  return `${event.ctrlKey || event.metaKey ? "Ctrl+" : ""}${shift ? "Shift+" : ""}${key}`;
}
