import { createElement } from "@/lib/defaults";
import { useEditor } from "@/store/editor";
import { textDocument } from "@/types/model";
import { strings } from "@/strings";
import { isString } from "@/lib/typeGuards";

export async function insertImage(file: File): Promise<void> {
  if (!/^image\/(png|jpeg|svg\+xml|gif|webp)$/.test(file.type))
    throw new Error(strings.images.chooseAPNGJPEGSVGGIFOrWebP);
  const image = await createImageBitmap(file);
  let blob: Blob = file;
  if (Math.max(image.width, image.height) > 4096) {
    const ratio = 4096 / Math.max(image.width, image.height);
    const canvas = new OffscreenCanvas(
      Math.round(image.width * ratio),
      Math.round(image.height * ratio),
    );
    const context = canvas.getContext(strings.images.value2d);
    if (!context) throw new Error(strings.images.imageProcessingIsUnavailable);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    blob = await canvas.convertToBlob({ type: strings.common.imagePng });
  }
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const reader = new FileReader();
  reader.onload = () =>
    isString(reader.result)
      ? resolve(reader.result)
      : reject(new Error(strings.images.unableToReadImage));
  reader.onerror = () => reject(new Error(strings.images.unableToReadImage));
  reader.readAsDataURL(blob);
  const assetId = await promise;
  const element = createElement(strings.common.image);
  if (element.type !== strings.common.image) throw new Error(strings.images.invalidImageDefaults);
  element.assetId = assetId;
  element.naturalWidth = image.width;
  element.naturalHeight = image.height;
  element.width = 700;
  element.height = (700 * image.height) / image.width;
  image.close();
  const store = useEditor.getState();
  store.mutate(strings.common.insertImage, (d) => {
    d.slides.find((s) => s.id === store.activeSlideId)?.elements.push(element);
  });
  store.select([element.id]);
}
export function pasteText(text: string): void {
  const element = createElement(strings.common.text);
  if (element.type !== strings.common.text) throw new Error(strings.images.invalidTextDefaults);
  element.content = textDocument(text);
  const store = useEditor.getState();
  store.mutate(strings.images.pasteText, (d) => {
    d.slides.find((s) => s.id === store.activeSlideId)?.elements.push(element);
  });
  store.select([element.id]);
}
