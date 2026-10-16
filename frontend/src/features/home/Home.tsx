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
import { toast } from "sonner";
import { applyTheme } from '@/features/theme/applyTheme';
import { textDocument } from '@/types/model';
import "./home.css";
import { strings } from "@/strings";

export function Home() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState<string>(strings.common.empty);
  const importInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    void listProjects().then(setProjects).catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : strings.persistence.libraryLoadFailed),
    );
  }, []);
  const create = async (blank: boolean, template=0) => {
    try {
      const doc = createPresentation();
      doc.id = crypto.randomUUID();
      if (blank) {
        doc.title = strings.home.untitledPresentation;
        doc.slides = [
          {
            id: crypto.randomUUID(),
            elements: [],
            background: { type: strings.common.solid, color: strings.common.colorffffff },
            notes: strings.common.empty,
            transition: { effect: strings.common.none, duration: 400 },
          },
        ];
      }
      if(!blank&&template>0){
        const theme=themes[template];if(theme)applyTheme(doc,theme);
        doc.title=template===1?strings.home.aBoldBeginning:strings.home.theBiggerPicture;
        const heading=doc.slides[0]?.elements.find(e=>e.type===strings.common.text&&e.fontSize>=100);
        if(heading?.type===strings.common.text)heading.content=textDocument(template===1?strings.home.ideasThatMoveUs:strings.home.seeThingsDifferently);
      }
      await saveProject(doc);
      await useEditor.getState().loadProject(doc.id);
      void navigate(`${strings.common.edit}${doc.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : strings.persistence.createFailed);
    }
  };
  const upload = async (file: File) => {
    try {
      const doc = await importProject(file);
      await saveProject(doc);
      await useEditor.getState().loadProject(doc.id);
      void navigate(`${strings.common.edit}${doc.id}`);
      toast.success(strings.home.presentationImported);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : strings.home.importFailed);
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
        <span className={strings.home.workspaceLabel}>{strings.home.yOURCREATIVEWORKSPACE}</span>
        <UserAvatar />
      </header>
      <main>
        <div className={strings.home.homeIntro}>
          <div>
            <span className={strings.home.eyebrow}>{strings.home.aLITTLESPACEFORBIGIDEAS}</span>
            <h1>{strings.home.yourNextChapterStartsHere}</h1>
            <p>{strings.home.bringYourThinkingToLifeMakeSomethingWorthSharing}</p>
          </div>
          <button
            className={strings.common.presentAction}
            onClick={() => {
              void create(true);
            }}
          >
            <Plus size={17} />{strings.home.newPresentation}</button>
        </div>
        <section className={strings.home.templateSection}>
          <div className={strings.home.sectionHeading}>
            <h2>{strings.home.startWithALittleInspiration}</h2>
            <span>{strings.home.mADETOMAKEYOUROWN}<Sparkles size={13} />
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
            ].map((t,template) => (
              <button
                key={t.name}
                onClick={() => {
                  void create(false,template);
                }}
              >
                <div
                  className={strings.home.templatePreview}
                  style={{ background: t.color }}
                >
                  <span>{t.tag}</span>
                  <b>{t.title}</b>
                  <i>
                    <ArrowRight size={28} />
                  </i>
                </div>
                <h3>{t.name}</h3>
                <p>{t.label}</p>
              </button>
            ))}
          </div>
        </section>
        <section>
          <div className={strings.home.sectionHeading}>
            <h2>{strings.home.yourPresentations}{strings.common.space}
              <span className={strings.home.projectCount}>{projects.length}</span>
            </h2>
            <div className={strings.home.projectControls}>
              <label className={strings.home.searchProjects}>
                <Search size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={strings.home.findAPresentation}
                />
              </label>
              <button
                type="button"
                className={strings.home.importProject}
                onClick={() => importInputRef.current?.click()}
              >
                <FileUp size={15} />{strings.home.import}
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
          <div className={strings.home.projectGrid}>
            {projects
              .filter((p) =>
                p.title.toLowerCase().includes(search.toLowerCase()),
              )
              .map((project) => (
                <article key={project.id}>
                  <button
                    className={strings.home.projectPreview}
                    onClick={() => {
                      void navigate(`${strings.common.edit}${project.id}`);
                    }}
                  >
                    {project.preview && (
                      <div
                        style={{
                          width: 1920,
                          height: 1080,
                          transform: strings.home.scale16,
                          transformOrigin: strings.home.topLeft,
                        }}
                      >
                        <SlideRenderer
                          slide={project.preview}
                          theme={project.theme}
                          logicalSize={project.slideSize}
                        />
                      </div>
                    )}
                  </button>
                  <div className={strings.home.projectMeta}>
                    <div>
                      <h3>{project.title}</h3>
                      <p>
                        {project.slideCount}{strings.home.slidesEdited}{strings.common.space}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button aria-label={`${strings.home.rename}${project.title}`} onClick={()=>{
                      const title=window.prompt(strings.common.presentationTitle,project.title);if(!title?.trim())return;
                      void useEditor.getState().loadProject(project.id).then(async()=>{
                        useEditor.getState().mutate(strings.common.renamePresentation,draft=>{draft.title=title.trim()});
                        await useEditor.getState().saveProject();setProjects(await listProjects());
                      }).catch((error:unknown)=>toast.error(error instanceof Error?error.message:strings.home.renameFailed));
                    }}><Pencil size={14}/></button>
                    <button aria-label={`${strings.home.duplicate}${project.title}`} onClick={()=>{
                      void useEditor.getState().loadProject(project.id).then(async()=>{
                        const doc=structuredClone(useEditor.getState().document);doc.id=crypto.randomUUID();doc.title+=strings.home.copy;doc.createdAt=new Date().toISOString();
                        useEditor.getState().setDocument(doc);await useEditor.getState().saveProject();setProjects(await listProjects());
                      }).catch((error:unknown)=>toast.error(error instanceof Error?error.message:strings.home.duplicateFailed));
                    }}><Copy size={14}/></button>
                    <button
                      aria-label={`${strings.home.delete}${project.title}`}
                      onClick={() => {
                        if (window.confirm(`${strings.home.delete_fdd77e66}${project.title}${strings.home.symbol}`))
                          void deleteProject(project.id).then(() =>
                            setProjects((p) =>
                              p.filter((x) => x.id !== project.id),
                            ),
                          ).catch((error: unknown) =>
                            toast.error(error instanceof Error ? error.message : strings.persistence.deleteFailed),
                          );
                      }}
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
              <b>{strings.home.aBlankCanvas}</b>
              <p>{strings.home.everyGreatIdeaStartsSomewhere}</p>
            </button>
          </div>
        </section>
      </main>
      <footer>{strings.home.thoughtfullyMadeForYourNextBigIdea}<span>{strings.home.fOLIOPRESENTATIONSTUDIO}</span>
      </footer>
    </div>
  );
}
