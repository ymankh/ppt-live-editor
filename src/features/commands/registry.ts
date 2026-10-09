import { useEditor } from "@/store/editor";
import { useView } from '@/store/view';
import { strings } from "@/strings";

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
    id: strings.common.undo,
    label: strings.common.undo_a8283ade,
    shortcut: strings.commands.ctrlZ,
    menu: strings.common.edit_464c4ffd,
    run: () => s().undo(),
  },
  {
    id: strings.common.redo,
    label: strings.common.redo_74273989,
    shortcut: strings.commands.ctrlShiftZ,
    aliases:[strings.commands.ctrlY],
    menu: strings.common.edit_464c4ffd,
    run: () => s().redo(),
  },
  {
    id: strings.common.copy,
    label: strings.commands.copy,
    shortcut: strings.commands.ctrlC,
    menu: strings.common.edit_464c4ffd,
    selection: true,
    run: () => {
      s().copySelection();
    },
  },
  {
    id: strings.common.cut,
    label: strings.commands.cut,
    shortcut: strings.commands.ctrlX,
    menu: strings.common.edit_464c4ffd,
    selection: true,
    run: () => {
      s().cutSelection();
    },
  },
  {
    id: strings.common.paste,
    label: strings.commands.paste,
    shortcut: strings.commands.ctrlV,
    menu: strings.common.edit_464c4ffd,
    run: () => {
      s().pasteClipboard();
    },
  },
  {
    id: strings.common.duplicate,
    label: strings.commands.duplicate,
    shortcut: strings.commands.ctrlD,
    menu: strings.common.edit_464c4ffd,
    selection: true,
    run: () => s().duplicateSelection(),
  },
  {
    id: strings.common.delete,
    label: strings.commands.delete,
    shortcut: strings.commands.delete,
    menu: strings.common.edit_464c4ffd,
    selection: true,
    run: () => s().deleteSelection(),
  },
  {
    id: strings.commands.selectAll_c4ca93e8,
    label: strings.commands.selectAll,
    shortcut: strings.commands.ctrlA,
    menu: strings.common.edit_464c4ffd,
    run: () =>
      s().select(
        s()
          .document.slides.find((x) => x.id === s().activeSlideId)
          ?.elements.map((x) => x.id) ?? [],
      ),
  },
  {
    id: strings.common.slide,
    label: strings.commands.newSlide,
    shortcut: strings.commands.ctrlM,
    menu: strings.common.slide_6bb4c117,
    run: () => s().addSlide(),
  },
  {
    id: strings.common.text,
    label: strings.commands.textBox,
    shortcut: strings.common.t,
    menu: strings.common.insert,
    run: () => s().insert(strings.common.text),
  },
  {
    id: strings.common.rectangle,
    label: strings.common.rectangle_03069962,
    shortcut: strings.commands.r,
    menu: strings.common.insert,
    run: () => s().insert(strings.common.shape, strings.common.rect),
  },
  {
    id: strings.common.ellipse,
    label: strings.commands.ellipse,
    shortcut: strings.commands.o,
    menu: strings.common.insert,
    run: () => s().insert(strings.common.shape, strings.common.ellipse),
  },
  {
    id: strings.common.line,
    label: strings.common.line_d7852cd0,
    shortcut: strings.common.l,
    menu: strings.common.insert,
    run: () => s().insert(strings.common.line),
  },
  {
    id: strings.common.table,
    label: strings.common.table_16d1c905,
    menu: strings.common.insert,
    run: () => s().insert(strings.common.table),
  },
  {
    id: strings.common.chart,
    label: strings.common.chart_3e5b90ae,
    menu: strings.common.insert,
    run: () => s().insert(strings.common.chart),
  },
  {
    id: strings.common.front,
    label: strings.common.bringToFront,
    shortcut: strings.commands.ctrlShift_a75e7e07,
    menu: strings.common.arrange,
    selection: true,
    run: () => s().arrange(strings.common.front),
  },
  {
    id: strings.common.back,
    label: strings.common.sendToBack,
    shortcut: strings.commands.ctrlShift,
    menu: strings.common.arrange,
    selection: true,
    run: () => s().arrange(strings.common.back),
  },
  {
    id: strings.common.forward,
    label: strings.common.bringForward,
    shortcut: strings.commands.ctrl_d8e5871f,
    menu: strings.common.arrange,
    selection: true,
    run: () => s().arrange(strings.common.forward),
  },
  {
    id: strings.common.backward,
    label: strings.common.sendBackward,
    shortcut: strings.commands.ctrl_e8624caf,
    menu: strings.common.arrange,
    selection: true,
    run: () => s().arrange(strings.common.backward),
  },
  {
    id: strings.common.group,
    label: strings.commands.group,
    shortcut: strings.commands.ctrlG,
    menu: strings.common.arrange,
    selection: true,
    run: () => {
      const groupId = crypto.randomUUID();
      s().mutate(strings.commands.group, (d) => {
        d.slides
          .find((x) => x.id === s().activeSlideId)
          ?.elements.forEach((e) => {
            if (s().selection.includes(e.id)) e.groupId = groupId;
          });
      });
    },
  },
  {
    id: strings.common.ungroup,
    label: strings.commands.ungroup,
    shortcut: strings.commands.ctrlShiftG,
    menu: strings.common.arrange,
    selection: true,
    run: () =>
      s().mutate(strings.commands.ungroup, (d) => {
        d.slides
          .find((x) => x.id === s().activeSlideId)
          ?.elements.forEach((e) => {
            if (s().selection.includes(e.id)) delete e.groupId;
          });
      }),
  },
  {
    id: strings.common.lock,
    label: strings.commands.lockUnlock,
    shortcut: strings.commands.ctrlL,
    menu: strings.common.arrange,
    selection: true,
    run: () =>
      s().mutate(strings.commands.lock, (d) => {
        d.slides
          .find((x) => x.id === s().activeSlideId)
          ?.elements.forEach((e) => {
            if (s().selection.includes(e.id)) e.locked = !e.locked;
          });
      }),
  },
  ...([strings.common.left, strings.common.center, strings.common.right, strings.common.top, strings.common.middle, strings.common.bottom] as const).map(
    (position) => ({
      id: strings.commands.align + position,
      label: strings.common.align + position,
      menu: strings.common.arrange,
      selection: true,
      run: () => s().arrange(position),
    }),
  ),
  {
    id: strings.commands.zoomIn,
    label: strings.common.zoomIn,
    shortcut: strings.commands.ctrl_7fbd2ab5,
    menu: strings.common.view,
    run: () => s().setZoom(Math.min(4, s().zoom + 0.1)),
  },
  {
    id: strings.commands.zoomOut,
    label: strings.common.zoomOut,
    shortcut: strings.commands.ctrl_204690e6,
    menu: strings.common.view,
    run: () => s().setZoom(Math.max(0.25, s().zoom - 0.1)),
  },
  {
    id: strings.commands.fit,
    label: strings.commands.fitToScreen,
    shortcut: strings.commands.ctrl0,
    menu: strings.common.view,
    run: () => s().setZoom(1),
  },
  {
    id: strings.commands.save,
    label: strings.commands.savePresentation,
    shortcut: strings.commands.ctrlS,
    menu: strings.common.file_50009ce1,
    run: () => {
      void s().saveProject();
    },
  },
  {id:strings.commands.selectTool,label:strings.commands.selectionTool,shortcut:strings.commands.v,menu:strings.common.insert,run:()=>s().setTool(strings.common.select)},
  {id:strings.common.image,label:strings.common.uploadImage,shortcut:strings.common.i,menu:strings.common.insert,run:()=>window.document.querySelector<HTMLButtonElement>(strings.commands.ariaLabelUploadImage)?.click()},
  {id:strings.common.pastePlace,label:strings.commands.pasteInPlace,shortcut:strings.commands.ctrlShiftV,menu:strings.common.edit_464c4ffd,run:()=>s().pasteClipboard(strings.common.inPlace)},
  {id:strings.commands.grid,label:strings.common.toggleGrid,shortcut:strings.commands.ctrl_38cc2c6c,menu:strings.common.view,run:()=>useView.getState().toggleGrid()},
  {id:strings.commands.rulers,label:strings.common.toggleRulers,shortcut:strings.commands.ctrlR,menu:strings.common.view,run:()=>useView.getState().toggleRulers()},
  {id:strings.commands.snap,label:strings.common.toggleSnapping,shortcut:strings.commands.ctrl_e7dc26f6,menu:strings.common.view,run:()=>useView.getState().toggleSnap()},
  {id:strings.commands.actualSize,label:strings.commands.value100Zoom,shortcut:strings.commands.ctrl1,menu:strings.common.view,run:()=>s().setZoom(1)},
  {id:strings.commands.distributeH,label:strings.common.distributeHorizontally,menu:strings.common.arrange,selection:true,run:()=>s().distribute(strings.common.horizontal)},
  {id:strings.commands.distributeV,label:strings.common.distributeVertically,menu:strings.common.arrange,selection:true,run:()=>s().distribute(strings.common.vertical)},
  {id:strings.commands.matchWidth,label:strings.common.matchWidth,menu:strings.common.arrange,selection:true,run:()=>s().matchSize(strings.common.width)},
  {id:strings.commands.matchHeight,label:strings.common.matchHeight,menu:strings.common.arrange,selection:true,run:()=>s().matchSize(strings.common.height)},
  {id:strings.commands.matchSize,label:strings.common.matchSize,menu:strings.common.arrange,selection:true,run:()=>s().matchSize(strings.common.both)},
  {id:strings.commands.flipH,label:strings.common.flipHorizontally,menu:strings.common.arrange,selection:true,run:()=>s().flip(strings.common.horizontal)},
  {id:strings.commands.flipV,label:strings.common.flipVertically,menu:strings.common.arrange,selection:true,run:()=>s().flip(strings.common.vertical)},
];
export function isEnabled(command: Command): boolean {
  const state=s();
  if(command.id===strings.common.undo)return state.past.length>0;
  if(command.id===strings.common.redo)return state.future.length>0;
  if(command.id===strings.common.group||command.id.startsWith(strings.commands.match))return state.selection.length>1;
  if(command.id.startsWith(strings.commands.distribute))return state.selection.length>2;
  return !command.selection || state.selection.length > 0;
}
export function normalizeShortcut(event: KeyboardEvent): string {
  const punctuation:Record<string,string>={BracketLeft:strings.commands.symbol_245843ab,BracketRight:strings.commands.symbol_cfae0d42,Equal:strings.commands.symbol_380918b9,Minus:strings.common.symbol_3973e022,Quote:strings.commands.symbol_265fda17,Semicolon:strings.commands.symbol};
  const key = punctuation[event.code]??(event.key.length === 1 ? event.key.toUpperCase() : event.key);
  const shift=event.shiftKey&&event.code!==strings.commands.equal;
  return `${event.ctrlKey || event.metaKey ? strings.commands.ctrl : strings.common.empty}${shift ? strings.commands.shift : strings.common.empty}${key}`;
}
