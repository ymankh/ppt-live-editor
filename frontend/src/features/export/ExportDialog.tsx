import { useState } from 'react';
import { Check, Download, FileArchive, FileImage, FileText, Loader2, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEditor } from '@/store/editor';
import { exportImages, exportPdf, exportPptx, exportProject } from './export';
import { Choice } from '@/components/common/PropertyInputs';
import { userMessage } from '@/features/errors/userMessage';
import { strings } from "@/strings";
import { translate, useLocale, useTranslation } from '@/features/localization/locale';
import { interpolate } from '@/features/localization/format';


type Format = 'project' | 'pptx' | 'pdf' | 'png';
const formats = [
  { id: strings.export.project, title: strings.export.folioProject, extension: strings.export.pptjson, detail: strings.export.editableProjectWithAllImageAssetsIncluded, icon: FileArchive },
  { id: strings.export.pptx_1512e97a, title: strings.export.powerPoint, extension: strings.export.pptx, detail: strings.export.editableTextShapesTablesAndCharts, icon: Presentation },
  { id: strings.export.pdf_c35b21d6, title: strings.export.pDFDocument, extension: strings.export.pdf, detail: strings.export.aBeautifulShareReadyCopyOfEverySlide, icon: FileText },
  { id: strings.export.png, title: strings.export.slideImages_cb2928d9, extension: strings.export.zip, detail: strings.export.pNGOrJPEGImagesBundledInOneZIP, icon: FileImage },
] as const;
export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslation();
  const document = useEditor(state => state.document);
  const activeSlideId = useEditor(state => state.activeSlideId);
  const [notesPages, setNotesPages] = useState(false);
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>(strings.export.png);
  const [imageScope, setImageScope] = useState<'all' | 'current'>(strings.export.all);
  const [imageScale, setImageScale] = useState(1);
  const [format, setFormat] = useState<Format>(strings.export.pdf_c35b21d6);
  const [busy, setBusy] = useState(false);
  const runExport = async () => {
    if (busy) return;
    setBusy(true);
    const notification = toast.loading(`${t(strings.export.preparing)}${format === strings.export.png ? t(strings.export.slideImages) : format === strings.export.project ? t(strings.export.yourProject) : format.toUpperCase()}${strings.export.symbol_b4935894}`, { description: interpolate(t(strings.export.exportProgress), { count: document.slides.length }) });
    try {
      if (format === strings.export.project) await exportProject(document);
      if (format === strings.export.pptx_1512e97a) await exportPptx(document);
      if (format === strings.export.pdf_c35b21d6) await exportPdf(document, { notesPages });
      if (format === strings.export.png) await exportImages(document, { format: imageFormat, scope: imageScope, currentSlideId: activeSlideId, scale: imageScale });
      toast.success(translate(strings.export.yourExportIsReady, useLocale.getState().locale), { id: notification, description: translate(strings.export.checkYourDownloadsFolder, useLocale.getState().locale) });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(translate(strings.export.exportCouldNotBeCompleted, useLocale.getState().locale), { id: notification, description: translate(userMessage(error, strings.export.pleaseTryAgain), useLocale.getState().locale) });
    } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}>
    <DialogContent className={strings.export.smMaxW520pxP6} showCloseButton={!busy}>
      <DialogHeader><div className={strings.export.mb2FlexH11W11ItemsCenter}><Download size={22} /></div>
        <DialogTitle className={strings.export.textXl}>{t(strings.export.readyToShareYourStory)}</DialogTitle>
        <DialogDescription>{t(strings.export.chooseAFormatFor)}{document.title}{t(strings.export.symbol_73a14fb1)}</DialogDescription>
      </DialogHeader>
      <div className={strings.export.gridGap2Py2} role={strings.export.radiogroup} aria-label={t(strings.export.exportFormat)}>
        {formats.map(option => <Button key={option.id} variant={strings.common.outline} role={strings.export.radio} aria-checked={format === option.id} disabled={busy} onClick={() => setFormat(option.id)}
          className={`${strings.export.hAutoJustifyStartGap4WhitespaceNormalRounded}${format === option.id ? strings.export.borderPrimaryBgAccentRing1RingPrimary : strings.common.empty}`}>
          <option.icon size={24} className={format === option.id ? strings.export.textPrimary : strings.ui.textMutedForeground} />
          <span className={strings.export.flexFlex1FlexColGap1}><span className={strings.export.flexItemsCenterGap2FontSemibold}>{t(option.title)}<span dir="ltr" className={strings.export.textXsFontNormalTextMutedForeground}>{option.extension}</span></span>
            <span className={strings.export.textXsFontNormalTextMutedForeground}>{t(option.detail)}</span></span>
          {format === option.id && <Check size={17} className={strings.export.textPrimary} />}
        </Button>)}
      </div>
      {format === strings.export.pdf_c35b21d6 && <label className={strings.export.flexItemsCenterGap2TextSm}><input type={strings.export.checkbox} checked={notesPages} disabled={busy} onChange={event => setNotesPages(event.target.checked)} />{t(strings.export.includeSpeakerNotesPages)}</label>}
      {format === strings.export.png && <div className={strings.export.gridGridCols3Gap3TextSm}>
        <Choice label={t(strings.export.imageFormat)} value={imageFormat} options={[{value:strings.export.png,label:t(strings.export.pNG)},{value:strings.export.jpeg,label:t(strings.export.jPEG)}]} onChange={setImageFormat}/>
        <Choice label={t(strings.common.slides)} value={imageScope} options={[{value:strings.export.all,label:t(strings.export.allSlides)},{value:strings.export.current,label:t(strings.export.currentSlide)}]} onChange={setImageScope}/>
        <Choice label={t(strings.export.resolution)} value={String(imageScale)} options={[{value:strings.common.value1,label:t(strings.export.value1)},{value:strings.common.value2,label:t(strings.export.value2)},{value:strings.export.value3,label:t(strings.export.value3_50f6a1c4)},{value:strings.common.value4,label:t(strings.export.value4)}]} onChange={value=>setImageScale(Number(value))}/>
      </div>}
      <p className={strings.export.textXsLeadingRelaxedTextMutedForeground}>{t(format === strings.export.pptx_1512e97a ? strings.export.nativePowerPointObjectsRemainEditableSomeGradientsImage : format === strings.export.project ? strings.export.includesYourSlidesSpeakerNotesThemeAndEmbeddedImage : format === strings.export.pdf_c35b21d6 && notesPages ? strings.export.printReadyPagesWithEachSlideAndItsSpeaker : strings.export.exportsIncludeSkippedSlidesAnimationsAreNotIncludedSpeaker)}</p>
      <DialogFooter className={strings.export.mx6Mb6Mt1P4}><Button variant={strings.common.outline} disabled={busy} onClick={() => onOpenChange(false)}>{t(strings.common.cancel)}</Button>
        <Button disabled={busy} onClick={() => void runExport()}>{busy ? <Loader2 className={strings.export.animateSpin} size={16} /> : <Download size={16} />}{t(busy ? strings.export.preparingExport : strings.common.exportPresentation)}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
export default ExportDialog;
