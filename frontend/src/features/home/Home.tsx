import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  FileUp,
  Copy,
  Pencil,
  Plus,
  Presentation,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEditor } from "@/store/editor";
import { UserAvatar } from "@/components/common/UserAvatar";
import { createPresentation, themes } from "@/lib/defaults";
import {
  listProjects,
  saveProject,
  deleteProject,
  type ProjectSummary,
} from "@/features/persistence/repository";
import { SlideRenderer } from "@/features/renderer/SlideRenderer";
import { importProject } from "@/features/export/export";
import { notifyError } from "@/features/errors/userMessage";
import { toast } from "sonner";
import { applyTheme } from '@/features/theme/applyTheme';
import { textDocument } from '@/types/model';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "./home.css";
import { strings } from "@/strings";
import { translate, useLocale, useTranslation } from "@/features/localization/locale";
import { formatDate, interpolate } from "@/features/localization/format";
import { SettingsButton } from '@/features/localization/SettingsDialog';

type LibraryStatus = 'loading' | 'ready' | 'error';

/** The first slide, scaled to the card's measured width so it fills the card at every size and slide ratio. */
function ProjectPreview({ project }: { project: ProjectSummary }) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={host} style={{ width: strings.common.value100, aspectRatio: `${project.slideSize.width}${strings.common.symbol}${project.slideSize.height}` }}>
      {project.preview && width > 0 && (
        <SlideRenderer slide={project.preview} theme={project.theme} logicalSize={project.slideSize} width={width} />
      )}
    </div>
  );
}

export function Home() {
  const t = useTranslation();
  const interfaceLocale = useLocale((state) => state.locale);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [status, setStatus] = useState<LibraryStatus>('loading');
  const [search, setSearch] = useState<string>(strings.common.empty);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [renameTarget, setRenameTarget] = useState<ProjectSummary | null>(null);
  const [renameValue, setRenameValue] = useState<string>(strings.common.empty);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    void listProjects().then((loaded) => {
      if (cancelled) return;
      setProjects(loaded);
      setStatus('ready');
    }).catch((error: unknown) => {
      if (cancelled) return;
      // Without this the page would look like an empty library, with no way to retry.
      setStatus('error');
      notifyError(error, strings.errors.loadLibrary);
    });
    return () => { cancelled = true; };
  }, [attempt]);
  const query = search.trim().toLowerCase();
  const visibleProjects = projects.filter((p) => p.title.toLowerCase().includes(query));
  const create = async (blank: boolean, template=0) => {
    try {
      // Generated titles and slide copy use the interface language at creation time.
      const locale = useLocale.getState().locale;
      const doc = createPresentation(locale);
      doc.id = crypto.randomUUID();
      if (blank) {
        doc.title = translate(strings.home.untitledPresentation, locale);
        doc.slides = [
          {
            id: crypto.randomUUID(),
            elements: [],
            background: { type: strings.common.solid, color: strings.common.colorffffff },
            notes: strings.common.empty,
            // Seconds, like every other slide (see createSlide).
            transition: { effect: strings.common.none, duration: 0.45 },
          },
        ];
      }
      if(!blank&&template>0){
        const theme=themes[template];if(theme)applyTheme(doc,theme);
        doc.title=translate(template===1?strings.home.aBoldBeginning:strings.home.theBiggerPicture, locale);
        const heading=doc.slides[0]?.elements.find(e=>e.type===strings.common.text&&e.fontSize>=100);
        if(heading?.type===strings.common.text){
          const copy=translate(template===1?strings.home.ideasThatMoveUs:strings.home.seeThingsDifferently, locale);
          heading.content=textDocument(copy);heading.name=copy.split(strings.common.newline)[0]??heading.name;
        }
      }
      await saveProject(doc);
      await useEditor.getState().loadProject(doc.id);
      void navigate(`${strings.common.edit}${doc.id}`);
    } catch (error) {
      notifyError(error, strings.errors.createPresentation);
    }
  };
  const upload = async (file: File) => {
    try {
      const doc = await importProject(file);
      // An archive keeps the id it was exported with. Saving under that id would silently replace the
      // presentation it came from, including edits made since the export, so an import is always a new one.
      doc.id = crypto.randomUUID();
      await saveProject(doc);
      await useEditor.getState().loadProject(doc.id);
      void navigate(`${strings.common.edit}${doc.id}`);
      toast.success(translate(strings.home.presentationImported, useLocale.getState().locale));
    } catch (error) {
      notifyError(error, strings.errors.importPresentation);
    }
  };
  const rename = async () => {
    const project = renameTarget;
    const title = renameValue.trim();
    if (!project || !title) return;
    setRenameTarget(null);
    try {
      await useEditor.getState().loadProject(project.id);
      useEditor.getState().mutate(strings.common.renamePresentation, (draft) => { draft.title = title; });
      await useEditor.getState().saveProject();
      setProjects(await listProjects());
    } catch (error) {
      notifyError(error, strings.errors.renamePresentation);
    }
  };
  const remove = async () => {
    const project = deleteTarget;
    if (!project) return;
    setDeleteTarget(null);
    try {
      await deleteProject(project.id);
      setProjects((p) => p.filter((x) => x.id !== project.id));
    } catch (error) {
      notifyError(error, strings.errors.deletePresentation);
    }
  };
  return (
    <div className={strings.home.homePage}>
      <header>
        <a className={strings.home.homeBrand} href={strings.common.symbol_8a5edab2}>
          <span>
            <Presentation size={24} />
          </span>{strings.common.folio}<span className={strings.home.brandDot}>{strings.common.symbol_cdb4ee2a}</span>
        </a>
        <span className={strings.home.workspaceLabel}>{t(strings.home.yOURCREATIVEWORKSPACE)}</span>
        <UserAvatar />
        <SettingsButton className="settings-button" />
      </header>
      <main>
        <div className={strings.home.homeIntro}>
          <div>
            <span className={strings.home.eyebrow}>{t(strings.home.aLITTLESPACEFORBIGIDEAS)}</span>
            <h1>{t(strings.home.yourNextChapterStartsHere)}</h1>
            <p>{t(strings.home.bringYourThinkingToLifeMakeSomethingWorthSharing)}</p>
          </div>
          <button
            className={strings.common.presentAction}
            onClick={() => {
              void create(true);
            }}
          >
            <Plus size={17} />{t(strings.home.newPresentation)}</button>
        </div>
        <section className={strings.home.templateSection}>
          <div className={strings.home.sectionHeading}>
            <h2>{t(strings.home.startWithALittleInspiration)}</h2>
            <span>{t(strings.home.mADETOMAKEYOUROWN)}<Sparkles size={13} />
            </span>
          </div>
          <div className={strings.home.starterGrid}>
            {[
              {
                name: strings.common.theNextChapter_5529f97e,
                label: strings.home.strategyVision,
                color: strings.home.colorf5e8de,
                title: strings.common.theNextChapter,
                tag: strings.home.aFRESHPERSPECTIVE,
              },
              {
                name: strings.home.aBoldBeginning,
                label: strings.home.pitchProposal,
                color: strings.home.colordfe8e3,
                title: strings.home.ideasThatMoveUs,
                tag: strings.home.yOURNEXTBIGIDEA,
              },
              {
                name: strings.home.theBiggerPicture,
                label: strings.home.reportsInsights,
                color: strings.home.colore8e4f0,
                title: strings.home.seeThingsDifferently,
                tag: strings.home.lETSCONNECTTHEDOTS,
              },
            ].map((templateOption,template) => (
              <button
                key={templateOption.name}
                onClick={() => {
                  void create(false,template);
                }}
              >
                <div
                  className={strings.home.templatePreview}
                  style={{ background: templateOption.color }}
                >
                  <span>{t(templateOption.tag)}</span>
                  <b>{t(templateOption.title)}</b>
                  <i>
                    <ArrowRight size={28} className={strings.ui.rtlMirror} />
                  </i>
                </div>
                <h3>{t(templateOption.name)}</h3>
                <p>{t(templateOption.label)}</p>
              </button>
            ))}
          </div>
        </section>
        <section>
          <div className={strings.home.sectionHeading}>
            <h2>{t(strings.home.yourPresentations)}{strings.common.space}
              <span className={strings.home.projectCount}>{projects.length}</span>
            </h2>
            <div className={strings.home.projectControls}>
              <label className={strings.home.searchProjects}>
                <Search size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(strings.home.findAPresentation)}
                />
              </label>
              <button
                type="button"
                className={strings.home.importProject}
                onClick={() => importInputRef.current?.click()}
              >
                <FileUp size={15} />{t(strings.home.import)}
              </button>
              <input
                ref={importInputRef}
                type={strings.common.file}
                accept={strings.home.pptjsonPptx}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
              />
            </div>
          </div>
          {status === 'loading' && <p className={strings.home.libraryNote} role={strings.common.status}>{t(strings.home.loadingPresentations)}</p>}
          {status === 'error' && (
            <p className={strings.home.libraryNote} role={strings.home.alert}>
              {t(strings.home.presentationsNotLoaded)}
              <button type="button" onClick={() => setAttempt((value) => value + 1)}>{t(strings.home.tryAgain)}</button>
            </p>
          )}
          {status === 'ready' && query && visibleProjects.length === 0 && (
            <p className={strings.home.libraryNote} role={strings.common.status}>{interpolate(t(strings.home.noMatchingPresentations), { query: search.trim() })}</p>
          )}
          <div className={strings.home.projectGrid}>
            {visibleProjects
              .map((project) => (
                <article key={project.id}>
                  <button
                    className={strings.home.projectPreview}
                    onClick={() => {
                      void navigate(`${strings.common.edit}${project.id}`);
                    }}
                  >
                    <ProjectPreview project={project} />
                  </button>
                  <div className={strings.home.projectMeta}>
                    <div>
                      <h3>{project.title}</h3>
                      <p>
                        {interpolate(t(strings.home.projectSummary), { count: project.slideCount, date: formatDate(project.updatedAt, interfaceLocale) })}
                      </p>
                    </div>
                    <button aria-label={`${t(strings.home.rename)}${project.title}`} onClick={()=>{
                      setRenameValue(project.title);setRenameTarget(project);
                    }}><Pencil size={14}/></button>
                    <button aria-label={`${t(strings.home.duplicate)}${project.title}`} onClick={()=>{
                      void useEditor.getState().loadProject(project.id).then(async()=>{
                        const doc=structuredClone(useEditor.getState().document);doc.id=crypto.randomUUID();doc.title+=translate(strings.home.copy, useLocale.getState().locale);doc.createdAt=new Date().toISOString();
                        useEditor.getState().setDocument(doc);await useEditor.getState().saveProject();setProjects(await listProjects());
                      }).catch((error:unknown)=>notifyError(error, strings.errors.duplicatePresentation));
                    }}><Copy size={14}/></button>
                    <button
                      aria-label={`${t(strings.home.delete)}${project.title}`}
                      onClick={() => setDeleteTarget(project)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            <button
              className={strings.home.blankProject}
              onClick={() => {
                void create(true);
              }}
            >
              <span>
                <Plus size={24} />
              </span>
              <b>{t(strings.home.aBlankCanvas)}</b>
              <p>{t(strings.home.everyGreatIdeaStartsSomewhere)}</p>
            </button>
          </div>
        </section>
      </main>
      <footer>{t(strings.home.thoughtfullyMadeForYourNextBigIdea)}<span>{t(strings.home.fOLIOPRESENTATIONSTUDIO)}</span>
      </footer>
      <Dialog open={renameTarget !== null} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <DialogContent>
          <form
            className={strings.home.dialogForm}
            onSubmit={(e) => {
              e.preventDefault();
              void rename();
            }}
          >
            <DialogHeader>
              <DialogTitle>{t(strings.common.renamePresentation)}</DialogTitle>
              <DialogDescription>{t(strings.home.renameDescription)}</DialogDescription>
            </DialogHeader>
            <Input
              aria-label={t(strings.common.presentationTitle)}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
            <DialogFooter>
              <DialogClose render={<Button type={strings.common.button} variant={strings.common.outline} />}>
                {t(strings.common.cancel)}
              </DialogClose>
              <Button type={strings.home.submit} disabled={!renameValue.trim()}>
                {t(strings.home.save)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t(strings.home.deletePresentation)}</DialogTitle>
            <DialogDescription>
              {t(strings.home.openQuote)}{deleteTarget?.title}{t(strings.home.deleteDescriptionSuffix)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant={strings.common.outline} />}>
              {t(strings.common.cancel)}
            </DialogClose>
            <Button variant={strings.common.destructive} onClick={() => void remove()}>
              {t(strings.home.deleteConfirm)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
