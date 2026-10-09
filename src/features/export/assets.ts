import type { Fill, Presentation } from '@/types/model';
import { getAsset } from '@/features/persistence/repository';
import { strings } from "@/strings";
import { isString } from "@/lib/typeGuards";


export async function fetchAsset(source: string): Promise<Blob> {
  const stored = await getAsset(source);
  if (stored) return stored;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`${strings.export.cannotReadImageAsset}${response.status}${strings.export.checkItsURLAndCORSPermissions}`);
  const blob = await response.blob();
  if (!blob.type.startsWith(strings.common.image_eb7ede85)) throw new Error(strings.export.anImageAssetHasAnUnsupportedContentType);
  return blob;
}
export function blobDataUrl(blob: Blob): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const reader = new FileReader();
  reader.onload = () => isString(reader.result) ? resolve(reader.result) : reject(new Error(strings.export.cannotEncodeAsset));
  reader.onerror = () => reject(reader.error ?? new Error(strings.export.cannotReadAsset));
  reader.readAsDataURL(blob);
  return promise;
}
export function replaceAssets(document: Presentation, replacements: Record<string, string>): void {
  const replace = (fill: Fill) => { if (fill.type === strings.common.image) fill.assetId = replacements[fill.assetId] ?? fill.assetId; };
  for (const slide of document.slides) {
    replace(slide.background);
    for (const element of slide.elements) {
      if (element.type === strings.common.image) element.assetId = replacements[element.assetId] ?? element.assetId;
      if (strings.common.fill in element) replace(element.fill);
      if (element.type === strings.common.table) {
        replace(element.style.headerFill);
        for (const row of element.rows) for (const cell of row.cells) replace(cell.fill);
      }
    }
  }
}
export function filename(title: string): string {
  return Array.from(title, character => character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? strings.common.symbol_3973e022 : character).join(strings.common.empty).trim() || strings.common.presentation;
}
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement(strings.export.a);
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
