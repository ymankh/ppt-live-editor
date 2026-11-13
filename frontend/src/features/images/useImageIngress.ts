import { useEffect } from "react";
import { toast } from "sonner";
import { insertImage, pasteText } from "./ingress";
import { clonedElements, useEditor } from "@/store/editor";
import { presentationSchema } from "@/features/export/schema";
import { notifyError } from "@/features/errors/userMessage";
import { translate, useLocale } from "@/features/localization/locale";
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
        void insertImage(image).catch((error: unknown) => notifyError(error, strings.errors.addImage));
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
          // The store's cloning also gives grouped copies their own group and fresh nested ids;
          // re-using the copied groupId would fuse the paste with the original group.
          const elements = clonedElements(parsed.slides[0]?.elements ?? []);
          state.mutate(strings.common.pasteElements, (draft) => {
            draft.slides
              .find((s) => s.id === state.activeSlideId)
              ?.elements.push(...elements);
          });
          state.select(elements.map((e) => e.id));
        } catch {
          toast.error(translate(strings.images.unableToPasteTheseElements, useLocale.getState().locale));
        }
      } else if (text) pasteText(text);
      else useEditor.getState().pasteClipboard();
    };
    window.addEventListener(strings.common.paste, paste);
    return () => window.removeEventListener(strings.common.paste, paste);
  }, []);
}
