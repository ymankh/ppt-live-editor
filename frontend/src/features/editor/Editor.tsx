import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Cloud,
  Download,
  Moon,
  Play,
  Presentation,
  Redo2,
  Sparkles,
  Sun,
  Undo2,
} from "lucide-react";
import { useEditor } from "@/store/editor";
import { Workspace } from "./Workspace";
import { StatusBar } from './StatusBar';
import { Toolbar } from "./Toolbar";
import { useImageIngress } from "@/features/images/useImageIngress";
import { ExportDialog } from '@/features/export/ExportDialog';
import {
  commands,
  isEnabled,
  normalizeShortcut,
} from "@/features/commands/registry";
import { ShellDialogs } from "./ShellDialogs";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarShortcut,
} from "@/components/ui/menubar";
import "./editor.css";
import { toast } from "sonner";
import { strings } from "@/strings";

export function Editor() {
  useImageIngress();
  const document = useEditor((s) => s.document);
  const activeId = useEditor((s) => s.activeSlideId);
  const saveStatus = useEditor((s) => s.saveStatus);
  const past = useEditor((s) => s.past);
  const future = useEditor((s) => s.future);
  const [exportOpen, setExportOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [notes, setNotes] = useState(true);
  const [dark, setDark] = useState(
    () =>
      localStorage.getItem(strings.editor.folioTheme) === strings.common.dark ||
      (!localStorage.getItem(strings.editor.folioTheme) &&
        matchMedia(strings.editor.prefersColorSchemeDark).matches),
  );
  const navigate = useNavigate();
  const { projectId } = useParams();
  const index = document.slides.findIndex((s) => s.id === activeId);
  useEffect(() => {
    if (projectId && projectId !== document.id)
      void useEditor.getState().loadProject(projectId).catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : strings.persistence.projectLoadFailed),
      );
  }, [projectId, document.id]);
  useEffect(() => {
    if (!projectId) void useEditor.getState().restoreProject().catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : strings.persistence.restoreFailed),
    );
  }, [projectId]);
  useEffect(() => {
    window.document.documentElement.classList.toggle(strings.common.dark, dark);
    localStorage.setItem(strings.editor.folioTheme, dark ? strings.common.dark : strings.common.light);
  }, [dark]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ([strings.common.iNPUT, strings.common.tEXTAREA, strings.editor.sELECT] as readonly string[]).includes(target.tagName))
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === strings.editor.k_8254c329) {
        event.preventDefault();
        setPalette((v) => !v);
        return;
      }
      if (event.key === strings.editor.symbol) {
        setHelp(true);
        return;
      }
      if (event.key === strings.editor.f5) {
        event.preventDefault();
        void navigate(
          `${strings.common.present}${document.id}${strings.editor.slide}${event.shiftKey ? index : 0}`,
        );
        return;
      }
      const combo = normalizeShortcut(event);
      const command = commands.find(
        (c) => c.shortcut?.toUpperCase() === combo.toUpperCase() || c.aliases?.some(alias=>alias.toUpperCase()===combo.toUpperCase()),
      );
      if (command && isEnabled(command)) {
        if (command.id === strings.common.paste) return;
        event.preventDefault();
        command.run();
      }
      if (event.key === strings.common.escape) useEditor.getState().select([]);
      if(event.key===strings.editor.backspace&&useEditor.getState().selection.length){event.preventDefault();useEditor.getState().deleteSelection()}
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key===strings.common.enter){event.preventDefault();void navigate(`${strings.common.present}${document.id}${strings.editor.slide}${index}`)}
    };
    window.addEventListener(strings.common.keydown, handle);
    return () => window.removeEventListener(strings.common.keydown, handle);
  }, [document.id, index, navigate]);
  const toggleDark = () => {
    setDark(!dark);
    window.document.documentElement.classList.toggle(strings.common.dark, !dark);
  };
  return (
    <div className={strings.editor.editorApp}>
      <header className={strings.editor.appHeader}>
        <Link to={strings.common.projects} className={strings.editor.brandMark} aria-label={strings.editor.goToProjects}>
          <Presentation size={24} />
        </Link>
        <div className={strings.editor.documentHeading}>
          <div className={strings.editor.titleLine}>
            <input
              aria-label={strings.common.presentationTitle}
              value={document.title}
              onChange={(e) =>
                useEditor.getState().mutate(strings.common.renamePresentation, (d) => {
                  d.title = e.target.value;
                })
              }
            />
            <span className={strings.editor.savedTag}>
              <Cloud size={14} />
              {saveStatus === strings.common.saved ? strings.editor.saved : saveStatus}
            </span>
          </div>
          <Menubar className={strings.editor.applicationMenubar}>
            {[
              strings.common.file_50009ce1,
              strings.common.edit_464c4ffd,
              strings.common.view,
              strings.common.insert,
              strings.editor.format,
              strings.common.arrange,
              strings.common.slide_6bb4c117,
              strings.editor.help,
            ].map((menu) => (
              <MenubarMenu key={menu}>
                <MenubarTrigger>{menu}</MenubarTrigger>
                <MenubarContent>
                  {commands
                    .filter((c) => c.menu === menu)
                    .map((c) => (
                      <MenubarItem
                        key={c.id}
                        disabled={!isEnabled(c)}
                        onClick={c.run}
                      >
                        {c.id===strings.common.undo&&past.length?`${strings.editor.undo}${past.at(-1)?.label??strings.common.empty}`:c.id===strings.common.redo&&future.length?`${strings.editor.redo}${future.at(-1)?.label??strings.common.empty}`:c.label}
                        <MenubarShortcut>
                          {c.shortcut?.replace(strings.common.ctrl, strings.common.symbol_70b4b62a)}
                        </MenubarShortcut>
                      </MenubarItem>
                    ))}
                  {menu === strings.common.file_50009ce1 && (
                    <>
                      <MenubarItem
                        onClick={() => {
                          void navigate(strings.common.projects);
                        }}
                      >{strings.editor.allPresentations}</MenubarItem>
                      <MenubarItem onClick={() => setExportOpen(true)}>{strings.common.exportPresentation}</MenubarItem>
                    </>
                  )}
                  {menu === strings.common.view && (
                    <>
                      <MenubarItem onClick={() => setNotes(!notes)}>{strings.editor.toggleSpeakerNotes}</MenubarItem>
                      <MenubarItem onClick={toggleDark}>{strings.editor.toggleDarkMode}</MenubarItem>
                    </>
                  )}
                  {menu === strings.editor.format && (
                    <MenubarItem onClick={() => setThemeOpen(true)}>{strings.editor.presentationTheme}</MenubarItem>
                  )}
                  {menu === strings.editor.help && (
                    <MenubarItem onClick={() => setHelp(true)}>{strings.editor.keyboardShortcuts}</MenubarItem>
                  )}
                </MenubarContent>
              </MenubarMenu>
            ))}
          </Menubar>
        </div>
        <div className={strings.editor.headerActions}>
          <button className={strings.common.avatar} title={strings.editor.personalWorkspace}>{strings.common.jD}</button>
          <button
            className={strings.editor.headerIcon}
            aria-label={strings.editor.toggleDarkMode}
            onClick={toggleDark}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className={strings.editor.secondaryAction}
            onClick={() => setThemeOpen(true)}
          >
            <Sparkles size={15} />{strings.editor.theme}</button>
          <button
            className={strings.editor.secondaryAction}
            onClick={() => setExportOpen(true)}
          >
            <Download size={15} />{strings.editor.export}</button>
          <button
            className={strings.common.presentAction}
            onClick={() => {
              void navigate(`${strings.common.present}${document.id}${strings.editor.slide}${index}`);
            }}
          >
            <Play size={15} fill={strings.editor.currentColor} />{strings.editor.present}
          </button>
        </div>
      </header>
      <div className={strings.editor.toolbarRow}>
        <div className={strings.editor.historyButtons}>
          <button
            aria-label={strings.common.undo_a8283ade}
            disabled={!past.length}
            onClick={() => useEditor.getState().undo()}
          >
            <Undo2 size={17} />
          </button>
          <button
            aria-label={strings.common.redo_74273989}
            disabled={!future.length}
            onClick={() => useEditor.getState().redo()}
          >
            <Redo2 size={17} />
          </button>
        </div>
        <Toolbar />
      </div>
      <Workspace notes={notes} setNotes={setNotes} />
      <StatusBar openPalette={()=>setPalette(true)} openHelp={()=>setHelp(true)}/>
      {exportOpen&&<ExportDialog open={exportOpen} onOpenChange={setExportOpen}/>}
      <ShellDialogs
        palette={palette}
        setPalette={setPalette}
        help={help}
        setHelp={setHelp}
        themeOpen={themeOpen}
        setThemeOpen={setThemeOpen}
      />
    </div>
  );
}
