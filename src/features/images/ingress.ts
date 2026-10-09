import { createElement } from "@/lib/defaults";
import { useEditor } from "@/store/editor";
import { textDocument } from "@/types/model";
export async function insertImage(file: File): Promise<void> {
  if (!/^image\/(png|jpeg|svg\+xml|gif|webp)$/.test(file.type))
    throw new Error("Choose a PNG, JPEG, SVG, GIF, or WebP image.");
  const image = await createImageBitmap(file);
  let blob: Blob = file;
  if (Math.max(image.width, image.height) > 4096) {
    const ratio = 4096 / Math.max(image.width, image.height);
    const canvas = new OffscreenCanvas(
      Math.round(image.width * ratio),
      Math.round(image.height * ratio),
    );
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    blob = await canvas.convertToBlob({ type: "image/png" });
  }
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const reader = new FileReader();
  reader.onload = () =>
    typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("Unable to read image"));
  reader.onerror = () => reject(new Error("Unable to read image"));
  reader.readAsDataURL(blob);
  const assetId = await promise;
  const element = createElement("image");
  if (element.type !== "image") throw new Error("Invalid image defaults");
  element.assetId = assetId;
  element.naturalWidth = image.width;
  element.naturalHeight = image.height;
  element.width = 700;
  element.height = (700 * image.height) / image.width;
  image.close();
  const store = useEditor.getState();
  store.mutate("Insert image", (d) => {
    d.slides.find((s) => s.id === store.activeSlideId)?.elements.push(element);
  });
  store.select([element.id]);
}
export function pasteText(text: string): void {
  const element = createElement("text");
  if (element.type !== "text") throw new Error("Invalid text defaults");
  element.content = textDocument(text);
  const store = useEditor.getState();
  store.mutate("Paste text", (d) => {
    d.slides.find((s) => s.id === store.activeSlideId)?.elements.push(element);
  });
  store.select([element.id]);
}
