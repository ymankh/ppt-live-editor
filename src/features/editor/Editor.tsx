import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ChevronDown,
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
      localStorage.getItem("folio-theme") === "dark" ||
      (!localStorage.getItem("folio-theme") &&
        matchMedia("(prefers-color-scheme: dark)").matches),
  );
  const navigate = useNavigate();
  const { projectId } = useParams();
  const index = document.slides.findIndex((s) => s.id === activeId);
  useEffect(() => {
    if (projectId && projectId !== document.id)
      void useEditor.getState().loadProject(projectId);
  }, [projectId, document.id]);
  useEffect(() => {
    if (!projectId) void useEditor.getState().restoreProject();
  }, [projectId]);
  useEffect(() => {
    window.document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("folio-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((v) => !v);
        return;
      }
      if (event.key === "?") {
        setHelp(true);
        return;
      }
      if (event.key === "F5") {
        event.preventDefault();
        void navigate(
          `/present/${document.id}?slide=${event.shiftKey ? index : 0}`,
        );
        return;
      }
      const combo = normalizeShortcut(event);
      const command = commands.find(
        (c) => c.shortcut?.toUpperCase() === combo.toUpperCase() || c.aliases?.some(alias=>alias.toUpperCase()===combo.toUpperCase()),
      );
      if (command && isEnabled(command)) {
        if (command.id === "paste") return;
        event.preventDefault();
        command.run();
      }
      if (event.key === "Escape") useEditor.getState().select([]);
      if(event.key==='Backspace'&&useEditor.getState().selection.length){event.preventDefault();useEditor.getState().deleteSelection()}
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key==='Enter'){event.preventDefault();void navigate(`/present/${document.id}?slide=${index}`)}
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [document.id, index, navigate]);
  const toggleDark = () => {
    setDark(!dark);
    window.document.documentElement.classList.toggle("dark", !dark);
  };
  return (
    <div className="editor-app">
      <header className="app-header">
        <Link to="/projects" className="brand-mark" aria-label="Go to projects">
          <Presentation size={24} />
        </Link>
        <div className="document-heading">
          <div className="title-line">
            <input
              aria-label="Presentation title"
              value={document.title}
              onChange={(e) =>
                useEditor.getState().mutate("Rename presentation", (d) => {
                  d.title = e.target.value;
                })
              }
            />
            <span className="title-chevron">
              <ChevronDown size={14} />
            </span>
            <span className="saved-tag">
              <Cloud size={14} />
              {saveStatus === "Saved" ? "All changes saved" : saveStatus}
            </span>
          </div>
          <Menubar className="application-menubar">
            {[
              "File",
              "Edit",
              "View",
              "Insert",
              "Format",
              "Arrange",
              "Slide",
              "Help",
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
                        {c.id==='undo'&&past.length?`Undo ${past.at(-1)?.label??''}`:c.id==='redo'&&future.length?`Redo ${future.at(-1)?.label??''}`:c.label}
                        <MenubarShortcut>
                          {c.shortcut?.replace("Ctrl", "⌘")}
                        </MenubarShortcut>
                      </MenubarItem>
                    ))}
                  {menu === "File" && (
                    <>
                      <MenubarItem
                        onClick={() => {
                          void navigate("/projects");
                        }}
                      >
                        All presentations
                      </MenubarItem>
                      <MenubarItem onClick={() => setExportOpen(true)}>
                        Export presentation
                      </MenubarItem>
                    </>
                  )}
                  {menu === "View" && (
                    <>
                      <MenubarItem onClick={() => setNotes(!notes)}>
                        Toggle speaker notes
                      </MenubarItem>
                      <MenubarItem onClick={toggleDark}>
                        Toggle dark mode
                      </MenubarItem>
                    </>
                  )}
                  {menu === "Format" && (
                    <MenubarItem onClick={() => setThemeOpen(true)}>
                      Presentation theme
                    </MenubarItem>
                  )}
                  {menu === "Help" && (
                    <MenubarItem onClick={() => setHelp(true)}>
                      Keyboard shortcuts
                    </MenubarItem>
                  )}
                </MenubarContent>
              </MenubarMenu>
            ))}
          </Menubar>
        </div>
        <div className="header-actions">
          <button className="avatar" title="Personal workspace">
            JD
          </button>
          <button
            className="header-icon"
            aria-label="Toggle dark mode"
            onClick={toggleDark}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="secondary-action"
            onClick={() => setThemeOpen(true)}
          >
            <Sparkles size={15} />
            Theme
          </button>
          <button
            className="secondary-action"
            onClick={() => setExportOpen(true)}
          >
            <Download size={15} />
            Export
          </button>
          <button
            className="present-action"
            onClick={() => {
              void navigate(`/present/${document.id}?slide=${index}`);
            }}
          >
            <Play size={15} fill="currentColor" />
            Present
            <ChevronDown size={14} />
          </button>
        </div>
      </header>
      <div className="toolbar-row">
        <div className="history-buttons">
          <button
            aria-label="Undo"
            disabled={!past.length}
            onClick={() => useEditor.getState().undo()}
          >
            <Undo2 size={17} />
          </button>
          <button
            aria-label="Redo"
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
