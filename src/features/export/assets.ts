import type { Fill, Presentation } from '@/types/model';
import { getAsset } from '@/features/persistence/repository';

export async function fetchAsset(source: string): Promise<Blob> {
  const stored = await getAsset(source);
  if (stored) return stored;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Cannot read image asset (${response.status}). Check its URL and CORS permissions.`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('An image asset has an unsupported content type.');
  return blob;
}
export function blobDataUrl(blob: Blob): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Cannot encode asset'));
  reader.onerror = () => reject(reader.error ?? new Error('Cannot read asset'));
  reader.readAsDataURL(blob);
  return promise;
}
export function replaceAssets(document: Presentation, replacements: Record<string, string>): void {
  const replace = (fill: Fill) => { if (fill.type === 'image') fill.assetId = replacements[fill.assetId] ?? fill.assetId; };
  for (const slide of document.slides) {
    replace(slide.background);
    for (const element of slide.elements) {
      if (element.type === 'image') element.assetId = replacements[element.assetId] ?? element.assetId;
      if ('fill' in element) replace(element.fill);
      if (element.type === 'table') {
        replace(element.style.headerFill);
        for (const row of element.rows) for (const cell of row.cells) replace(cell.fill);
      }
    }
  }
}
export function filename(title: string): string {
  return Array.from(title, character => character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '-' : character).join('').trim() || 'presentation';
}
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
