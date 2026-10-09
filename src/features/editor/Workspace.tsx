import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useEditor } from "@/store/editor";
import { CanvasContextMenu } from '@/features/canvas/CanvasContextMenu';
import { SlidePanel } from "@/features/slides/SlidePanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { insertImage } from "@/features/images/ingress";
import { toast } from "sonner";
export function Workspace({
  notes,
  setNotes,
}: {
  notes: boolean;
  setNotes: (value: boolean) => void;
}) {
  const [layout]=useState(()=>{
    try {
      const value:unknown=JSON.parse(localStorage.getItem('folio-panels')??'null');
      if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
      const result:Record<string,number>={};
      for(const [key,size] of Object.entries(value)){if(typeof size!=='number'||!Number.isFinite(size)||size<=0)return undefined;result[key]=size}
      return result;
    }catch{return undefined}
  });
  const activeId = useEditor((s) => s.activeSlideId);
  const text = useEditor(
    (s) => s.document.slides.find((x) => x.id === s.activeSlideId)?.notes ?? "",
  );
  return (
    <main
      className="editor-body"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        for (const file of Array.from(event.dataTransfer.files))
          void insertImage(file).catch((error:unknown) =>
            toast.error(
              error instanceof Error ? error.message : "Image import failed",
            ),
          );
      }}
    >
      <ResizablePanelGroup
        orientation="horizontal"
        {...(layout?{defaultLayout:layout}:{})}
        onLayoutChanged={(layout) =>
          localStorage.setItem("folio-panels", JSON.stringify(layout))
        }
      >
        <ResizablePanel
          id="slides"
          defaultSize="220px"
          minSize="180px"
          maxSize="300px"
        >
          <SlidePanel />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="canvas" minSize="420px">
          <section className="canvas-column" style={{ height: "100%" }}>
            <CanvasContextMenu/>
            <div
              className="speaker-notes"
              style={!notes ? { height: 38 } : undefined}
            >
              <div className="notes-heading">
                <button onClick={() => setNotes(!notes)}>
                  {notes ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  Speaker notes
                </button>
                <span>Only visible to you while presenting</span>
              </div>
              {notes && (
                <textarea
                  aria-label="Speaker notes"
                  placeholder="Add a little context. Your audience won’t see this."
                  value={text}
                  onChange={(e) =>
                    useEditor.getState().mutate("Edit notes", (d) => {
                      const slide = d.slides.find((s) => s.id === activeId);
                      if (slide) slide.notes = e.target.value;
                    })
                  }
                />
              )}
            </div>
          </section>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          id="properties"
          defaultSize="270px"
          minSize="240px"
          maxSize="350px"
        >
          <PropertiesPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
