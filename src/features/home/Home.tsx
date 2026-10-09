import { useEffect, useState } from "react";
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
export function Home() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    void listProjects().then(setProjects);
  }, []);
  const create = async (blank: boolean, template=0) => {
    const doc = createPresentation();
    doc.id = crypto.randomUUID();
    if (blank) {
      doc.title = "Untitled presentation";
      doc.slides = [
        {
          id: crypto.randomUUID(),
          elements: [],
          background: { type: "solid", color: "#ffffff" },
          notes: "",
          transition: { effect: "none", duration: 400 },
        },
      ];
    }
    if(!blank&&template>0){
      const theme=themes[template];if(theme)applyTheme(doc,theme);
      doc.title=template===1?'A bold beginning':'The bigger picture';
      const heading=doc.slides[0]?.elements.find(e=>e.type==='text'&&e.fontSize>=100);
      if(heading?.type==='text')heading.content=textDocument(template===1?'Ideas that\nmove us.':'See things\ndifferently.');
    }
    await saveProject(doc);
    await useEditor.getState().loadProject(doc.id);
    void navigate(`/edit/${doc.id}`);
  };
  const upload = async (file: File) => {
    try {
      const doc = await importProject(file);
      await saveProject(doc);
      await useEditor.getState().loadProject(doc.id);
      void navigate(`/edit/${doc.id}`);
      toast.success("Presentation imported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    }
  };
  return (
    <div className="home-page">
      <header>
        <a className="home-brand" href="/">
          <span>
            <Presentation size={24} />
          </span>
          folio<span className="brand-dot">.</span>
        </a>
        <span className="workspace-label">YOUR CREATIVE WORKSPACE</span>
        <button className="avatar">JD</button>
      </header>
      <main>
        <div className="home-intro">
          <div>
            <span className="eyebrow">A LITTLE SPACE FOR BIG IDEAS</span>
            <h1>Your next chapter starts here.</h1>
            <p>Bring your thinking to life. Make something worth sharing.</p>
          </div>
          <button
            className="present-action"
            onClick={() => {
              void create(true);
            }}
          >
            <Plus size={17} />
            New presentation
          </button>
        </div>
        <section className="template-section">
          <div className="section-heading">
            <h2>Start with a little inspiration</h2>
            <span>
              MADE TO MAKE YOUR OWN <Sparkles size={13} />
            </span>
          </div>
          <div className="starter-grid">
            {[
              {
                name: "The next chapter",
                label: "Strategy & vision",
                color: "#f5e8de",
                title: "The next\nchapter.",
                tag: "A FRESH PERSPECTIVE",
              },
              {
                name: "A bold beginning",
                label: "Pitch & proposal",
                color: "#dfe8e3",
                title: "Ideas that\nmove us.",
                tag: "YOUR NEXT BIG IDEA",
              },
              {
                name: "The bigger picture",
                label: "Reports & insights",
                color: "#e8e4f0",
                title: "See things\ndifferently.",
                tag: "LET’S CONNECT THE DOTS",
              },
            ].map((t,template) => (
              <button
                key={t.name}
                onClick={() => {
                  void create(false,template);
                }}
              >
                <div
                  className="template-preview"
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
          <div className="section-heading">
            <h2>
              Your presentations{" "}
              <span className="project-count">{projects.length}</span>
            </h2>
            <div className="project-controls">
              <label className="search-projects">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a presentation…"
                />
              </label>
              <label className="import-project">
                <FileUp size={15} />
                Import
                <input
                  type="file"
                  accept=".pptjson,.pptx"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                  }}
                />
              </label>
            </div>
          </div>
          <div className="project-grid">
            {projects
              .filter((p) =>
                p.title.toLowerCase().includes(search.toLowerCase()),
              )
              .map((project) => (
                <article key={project.id}>
                  <button
                    className="project-preview"
                    onClick={() => {
                      void navigate(`/edit/${project.id}`);
                    }}
                  >
                    {project.preview && (
                      <div
                        style={{
                          width: 1920,
                          height: 1080,
                          transform: "scale(.16)",
                          transformOrigin: "top left",
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
                  <div className="project-meta">
                    <div>
                      <h3>{project.title}</h3>
                      <p>
                        {project.slideCount} slides · Edited{" "}
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button aria-label={`Rename ${project.title}`} onClick={()=>{
                      const title=window.prompt('Presentation title',project.title);if(!title?.trim())return;
                      void useEditor.getState().loadProject(project.id).then(async()=>{
                        useEditor.getState().mutate('Rename presentation',draft=>{draft.title=title.trim()});
                        await useEditor.getState().saveProject();setProjects(await listProjects());
                      }).catch((error:unknown)=>toast.error(error instanceof Error?error.message:'Rename failed'));
                    }}><Pencil size={14}/></button>
                    <button aria-label={`Duplicate ${project.title}`} onClick={()=>{
                      void useEditor.getState().loadProject(project.id).then(async()=>{
                        const doc=structuredClone(useEditor.getState().document);doc.id=crypto.randomUUID();doc.title+=' (copy)';doc.createdAt=new Date().toISOString();
                        useEditor.getState().setDocument(doc);await useEditor.getState().saveProject();setProjects(await listProjects());
                      }).catch((error:unknown)=>toast.error(error instanceof Error?error.message:'Duplicate failed'));
                    }}><Copy size={14}/></button>
                    <button
                      aria-label={`Delete ${project.title}`}
                      onClick={() => {
                        if (window.confirm(`Delete “${project.title}”?`))
                          void deleteProject(project.id).then(() =>
                            setProjects((p) =>
                              p.filter((x) => x.id !== project.id),
                            ),
                          );
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            <button
              className="blank-project"
              onClick={() => {
                void create(true);
              }}
            >
              <span>
                <Plus size={24} />
              </span>
              <b>A blank canvas</b>
              <p>Every great idea starts somewhere.</p>
            </button>
          </div>
        </section>
      </main>
      <footer>
        Thoughtfully made for your next big idea.
        <span>FOLIO · PRESENTATION STUDIO</span>
      </footer>
    </div>
  );
}
