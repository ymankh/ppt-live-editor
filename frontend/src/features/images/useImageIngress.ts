import { useEffect } from "react";
import { toast } from "sonner";
import { insertImage, pasteText } from "./ingress";
import { useEditor } from "@/store/editor";
import { presentationSchema } from "@/features/export/schema";
import { strings } from "@/strings";
import { isObject } from "@/lib/typeGuards";

export function useImageIngress() {
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ([strings.common.iNPUT, strings.common.tEXTAREA] as readonly string[]).includes(target.tagName))
      )
        return;
      const image = Array.from(event.clipboardData?.files ?? []).find((file) =>
        file.type.startsWith(strings.common.image_eb7ede85),
      );
      if (image) {
        event.preventDefault();
        void insertImage(image).catch((error:unknown) =>
          toast.error(
            error instanceof Error ? error.message : strings.common.imageImportFailed,
          ),
        );
        return;
      }
      const text = event.clipboardData?.getData(strings.images.textPlain);
      event.preventDefault();
      if (text?.startsWith(strings.images.folio)) {
        try {
          const payload: unknown = JSON.parse(text);
          if (
            !payload ||
            !isObject(payload) ||
            !(strings.images.elements in payload)
          )
            throw new Error(strings.images.invalidClipboardData);
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
          state.mutate(strings.common.pasteElements, (draft) => {
            draft.slides
              .find((s) => s.id === state.activeSlideId)
              ?.elements.push(...elements);
          });
          state.select(elements.map((e) => e.id));
        } catch {
          toast.error(strings.images.unableToPasteTheseElements);
        }
      } else if (text) pasteText(text);
      else useEditor.getState().pasteClipboard();
    };
    window.addEventListener(strings.common.paste, paste);
    return () => window.removeEventListener(strings.common.paste, paste);
  }, []);
}
