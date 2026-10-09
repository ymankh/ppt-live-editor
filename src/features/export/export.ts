import { notesText } from '@/features/text/notes';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { z } from 'zod';
import type { Presentation } from '@/types/model';
import { blobDataUrl, download, fetchAsset, filename, replaceAssets } from './assets';
import { assetReferences } from '@/features/persistence/repository';
import { presentationSchema } from './schema';
import { rasterizeSlide } from './raster';
import { importPptx } from './importPptx';
import { strings } from "@/strings";

export { exportPptx } from './pptx';

const manifestSchema = z.object({ format: z.literal(strings.export.folioProject_fe7173dd), version: z.literal(1),
  assets: z.record(z.string(), z.object({ path: z.string().regex(/^assets\/[a-zA-Z0-9._-]+$/), mime: z.string().regex(/^image\//) })) });
const MAX_PROJECT_BYTES = 100 * 1024 * 1024;
export async function exportProject(presentation: Presentation): Promise<void> {
  const project = presentationSchema.parse(presentation);
  const zip = new JSZip();
  const assets: Record<string, { path: string; mime: string }> = {};
  const replacements: Record<string, string> = {};
  const references = assetReferences(project);
  for (const [index, source] of references.entries()) {
    const blob = await fetchAsset(source);
    const key = `${strings.export.asset}${index + 1}`;
    const path = `${strings.export.assets}${key}`;
    assets[key] = { path, mime: blob.type };
    replacements[source] = key;
    zip.file(path, blob);
  }
  replaceAssets(project, replacements);
  zip.file(strings.export.presentationJson, JSON.stringify(project));
  zip.file(strings.export.manifestJson, JSON.stringify({ format: strings.export.folioProject_fe7173dd, version: 1, assets }));
  download(await zip.generateAsync({ type: strings.export.blob, compression: strings.export.dEFLATE }), `${filename(project.title)}${strings.export.pptjson}`);
}
export async function importProject(file: File): Promise<Presentation> {
  if (file.size > MAX_PROJECT_BYTES) throw new Error(strings.export.projectFilesMustBeSmallerThan100MB);
  if (file.name.toLowerCase().endsWith(strings.export.pptx)) return presentationSchema.parse(await importPptx(file));
  if (file.name.toLowerCase().endsWith(strings.export.json)) return presentationSchema.parse(JSON.parse(await file.text()) as unknown);
  const zip = await JSZip.loadAsync(file);
  const json = zip.file(strings.export.presentationJson);
  const manifestFile = zip.file(strings.export.manifestJson);
  if (!json || !manifestFile) throw new Error(strings.export.thisIsNotAFolioProjectArchive);
  const manifest = manifestSchema.parse(JSON.parse(await manifestFile.async(strings.common.string)) as unknown);
  const project = presentationSchema.parse(JSON.parse(await json.async(strings.common.string)) as unknown);
  const replacements: Record<string, string> = {};
  let totalBytes = 0;
  for (const reference of assetReferences(project)) {
    const asset = manifest.assets[reference];
    const entry = asset && zip.file(asset.path);
    if (!asset || !entry) throw new Error(`${strings.export.missingEmbeddedAsset}${reference}`);
    const bytes = await entry.async(strings.export.arraybuffer);
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_PROJECT_BYTES) throw new Error(strings.export.expandedProjectAssetsExceed100MB);
    replacements[reference] = await blobDataUrl(new Blob([bytes], { type: asset.mime }));
  }
  replaceAssets(project, replacements);
  return project;
}
export interface PdfExportOptions { notesPages?: boolean }
/** Notes pages place the slide above its speaker notes, continuing long notes on extra pages. Defaults to slide-only PDF. */
export async function exportPdf(presentation: Presentation, options: PdfExportOptions = {}): Promise<void> {
  const { width, height } = presentation.slideSize;
  const pageWidth = options.notesPages ? 595.28 : width / 2;
  const pageHeight = options.notesPages ? 841.89 : height / 2;
  const orientation = pageWidth >= pageHeight ? strings.export.landscape : strings.export.portrait;
  const pdf = new jsPDF({ orientation, unit: strings.export.pt, format: [pageWidth, pageHeight] });
  for (const [index, slide] of presentation.slides.entries()) {
    if (index > 0) pdf.addPage([pageWidth, pageHeight], orientation);
    const image = await rasterizeSlide(presentation, slide);
    if (!options.notesPages) { pdf.addImage(image, strings.export.pNG, 0, 0, pageWidth, pageHeight); continue; }
    const margin = 36;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = Math.min(imageWidth * height / width, pageHeight * 0.45);
    const fittedWidth = imageHeight * width / height;
    pdf.addImage(image, strings.export.pNG, (pageWidth - fittedWidth) / 2, margin, fittedWidth, imageHeight);
    pdf.setFontSize(12);
    pdf.text(`${strings.common.slide_ff1e0604}${index + 1}${strings.export.speakerNotes}`, margin, margin + imageHeight + 28);
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(notesText(slide.notes) || strings.export.noSpeakerNotes, imageWidth) as string[];
    let y = margin + imageHeight + 50;
    for (const line of lines) {
      if (y > pageHeight - margin) { pdf.addPage([pageWidth, pageHeight], orientation); y = margin; }
      pdf.text(line, margin, y);
      y += 15;
    }
  }
  pdf.setProperties({ title: presentation.title, creator: strings.export.appName });
  pdf.save(`${filename(presentation.title)}${options.notesPages ? strings.export.notes : strings.common.empty}${strings.export.pdf}`);
}
export interface ImageExportOptions { format?: 'png' | 'jpeg'; scope?: 'all' | 'current'; currentSlideId?: string; scale?: number }
/** Defaults to all slides as 1× PNGs. Current-slide export requires currentSlideId; JPEG uses an opaque white backing. */
export async function exportImages(presentation: Presentation, options: ImageExportOptions = {}): Promise<void> {
  const format = options.format ?? strings.export.png;
  const scale = options.scale ?? 1;
  if (!Number.isFinite(scale) || scale <= 0 || scale > 4) throw new Error(strings.export.imageScaleMustBeGreaterThanZeroAndAt);
  const selected = options.scope === strings.export.current ? presentation.slides.filter(slide => slide.id === options.currentSlideId) : presentation.slides;
  if (!selected.length) throw new Error(strings.export.selectASlideToExport);
  const zip = new JSZip();
  for (const slide of selected) {
    const index = presentation.slides.indexOf(slide);
    const image = await rasterizeSlide(presentation, slide, { format, scale });
    zip.file(`${strings.export.slide}${String(index + 1).padStart(2, strings.common.value0)}${strings.common.symbol_cdb4ee2a}${format === strings.export.jpeg ? strings.export.jpg : strings.export.png}`, image.slice(image.indexOf(strings.common.symbol_d03502c4) + 1), { base64: true });
  }
  download(await zip.generateAsync({ type: strings.export.blob }), `${filename(presentation.title)}${strings.export.imagesZip}`);
}
