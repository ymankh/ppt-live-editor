import { useEffect } from "react";
import { toast } from "sonner";
import { insertImage, pasteText } from "./ingress";
import { useEditor } from "@/store/editor";
import { presentationSchema } from "@/features/export/schema";
export function useImageIngress() {
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA"].includes(target.tagName))
      )
        return;
      const image = Array.from(event.clipboardData?.files ?? []).find((file) =>
        file.type.startsWith("image/"),
      );
      if (image) {
        event.preventDefault();
        void insertImage(image).catch((error:unknown) =>
          toast.error(
            error instanceof Error ? error.message : "Image import failed",
          ),
        );
        return;
      }
      const text = event.clipboardData?.getData("text/plain");
      event.preventDefault();
      if (text?.startsWith('{"folio')) {
        try {
          const payload: unknown = JSON.parse(text);
          if (
            !payload ||
            typeof payload !== "object" ||
            !("elements" in payload)
          )
            throw new Error("Invalid clipboard data");
          const state = useEditor.getState();
          const slide = state.document.slides.find(
            (s) => s.id === state.activeSlideId,
          );
          if (!slide) return;
          const parsed = presentationSchema.parse({
            ...state.document,
            slides: [{ ...slide, elements: payload.elements }],
          });
          const elements = parsed.slides[0]?.elements ?? [];
          elements.forEach((element) => {
            element.id = crypto.randomUUID();
            element.x += 32;
            element.y += 32;
          });
          state.mutate("Paste elements", (draft) => {
            draft.slides
              .find((s) => s.id === state.activeSlideId)
              ?.elements.push(...elements);
          });
          state.select(elements.map((e) => e.id));
        } catch {
          toast.error("Unable to paste these elements");
        }
      } else if (text) pasteText(text);
      else useEditor.getState().pasteClipboard();
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, []);
}
