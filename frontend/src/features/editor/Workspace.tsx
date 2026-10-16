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
import { NotesEditor } from '@/features/text/NotesEditor';
import { toast } from "sonner";
import { strings } from "@/strings";
import { isNumber, isObject } from "@/lib/typeGuards";

export function Workspace({
  notes,
  setNotes,
}: {
  notes: boolean;
  setNotes: (value: boolean) => void;
}) {
  const [layout]=useState(()=>{
    try {
      const value:unknown=JSON.parse(localStorage.getItem(strings.editor.folioPanels)??strings.editor.null);
      if(!value||!isObject(value)||Array.isArray(value))return undefined;
      const result:Record<string,number>={};
      for(const [key,size] of Object.entries(value)){if(!isNumber(size)||!Number.isFinite(size)||size<=0)return undefined;result[key]=size}
      return result;
    }catch{return undefined}
  });
  const activeId = useEditor((s) => s.activeSlideId);
  const text = useEditor(
    (s) => s.document.slides.find((x) => x.id === s.activeSlideId)?.notes ?? strings.common.empty,
  );
  return (
    <main
      className={strings.editor.editorBody}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(strings.editor.files)) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        for (const file of Array.from(event.dataTransfer.files))
          void insertImage(file).catch((error:unknown) =>
            toast.error(
              error instanceof Error ? error.message : strings.common.imageImportFailed,
            ),
          );
      }}
    >
      <ResizablePanelGroup
        orientation={strings.common.horizontal}
        {...(layout?{defaultLayout:layout}:{})}
        onLayoutChanged={(layout) =>
          localStorage.setItem(strings.editor.folioPanels, JSON.stringify(layout))
        }
      >
        <ResizablePanel
          id={strings.editor.slides}
          defaultSize={strings.editor.value220px}
          minSize={strings.editor.value180px}
          maxSize={strings.editor.value300px}
        >
          <SlidePanel />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id={strings.editor.canvas} minSize={strings.editor.value420px}>
          <section className={strings.editor.canvasColumn} style={{ height: strings.common.value100 }}>
            <CanvasContextMenu/>
            <div
              className={strings.editor.speakerNotes}
              style={!notes ? { height: 38 } : undefined}
            >
              <div className={strings.editor.notesHeading}>
                <button onClick={() => setNotes(!notes)}>
                  {notes ? <ChevronDown size={14} /> : <ChevronUp size={14} />}{strings.common.notes}</button>
                <span>{strings.editor.notesHint}</span>
              </div>
              {notes&&<NotesEditor key={activeId} slideId={activeId} value={text}/>}
            </div>
          </section>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          id={strings.editor.properties_96adb924}
          defaultSize={strings.editor.value270px}
          minSize={strings.editor.value240px}
          maxSize={strings.editor.value350px}
        >
          <PropertiesPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
