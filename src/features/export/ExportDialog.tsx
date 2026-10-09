import { useState } from 'react';
import { Check, Download, FileArchive, FileImage, FileText, Loader2, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEditor } from '@/store/editor';
import { exportImages, exportPdf, exportPptx, exportProject } from './export';
import { Choice } from '@/components/common/PropertyInputs';

type Format = 'project' | 'pptx' | 'pdf' | 'png';
const formats = [
  { id: 'project', title: 'Folio project', extension: '.pptjson', detail: 'Editable project with all image assets included.', icon: FileArchive },
  { id: 'pptx', title: 'PowerPoint', extension: '.pptx', detail: 'Editable text, shapes, tables, and charts.', icon: Presentation },
  { id: 'pdf', title: 'PDF document', extension: '.pdf', detail: 'A beautiful, share-ready copy of every slide.', icon: FileText },
  { id: 'png', title: 'Slide images', extension: '.zip', detail: 'PNG or JPEG images, bundled in one ZIP.', icon: FileImage },
] as const;
export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const document = useEditor(state => state.document);
  const activeSlideId = useEditor(state => state.activeSlideId);
  const [notesPages, setNotesPages] = useState(false);
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>('png');
  const [imageScope, setImageScope] = useState<'all' | 'current'>('all');
  const [imageScale, setImageScale] = useState(1);
  const [format, setFormat] = useState<Format>('pdf');
  const [busy, setBusy] = useState(false);
  const runExport = async () => {
    if (busy) return;
    setBusy(true);
    const notification = toast.loading(`Preparing ${format === 'png' ? 'slide images' : format === 'project' ? 'your project' : format.toUpperCase()}…`, { description: `${document.slides.length} slides · Please keep this window open.` });
    try {
      if (format === 'project') await exportProject(document);
      if (format === 'pptx') await exportPptx(document);
      if (format === 'pdf') await exportPdf(document, { notesPages });
      if (format === 'png') await exportImages(document, { format: imageFormat, scope: imageScope, currentSlideId: activeSlideId, scale: imageScale });
      toast.success('Your export is ready', { id: notification, description: 'Check your downloads folder.' });
      onOpenChange(false);
    } catch (error) {
      toast.error('Export could not be completed', { id: notification, description: error instanceof Error ? error.message : 'Please try again.' });
    } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}>
    <DialogContent className="sm:max-w-[520px] p-6" showCloseButton={!busy}>
      <DialogHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#ed7355]"><Download size={22} /></div>
        <DialogTitle className="text-xl">Ready to share your story?</DialogTitle>
        <DialogDescription>Choose a format for “{document.title}”.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 py-2" role="radiogroup" aria-label="Export format">
        {formats.map(option => <Button key={option.id} variant="outline" role="radio" aria-checked={format === option.id} disabled={busy} onClick={() => setFormat(option.id)}
          className={`h-auto justify-start gap-4 whitespace-normal rounded-xl px-4 py-3 text-left ${format === option.id ? 'border-[#ed7355] bg-orange-50/60 ring-1 ring-[#ed7355]' : ''}`}>
          <option.icon size={24} className={format === option.id ? 'text-[#ed7355]' : 'text-stone-400'} />
          <span className="flex flex-1 flex-col gap-1"><span className="flex items-center gap-2 font-semibold">{option.title}<span className="text-xs font-normal text-muted-foreground">{option.extension}</span></span>
            <span className="text-xs font-normal text-muted-foreground">{option.detail}</span></span>
          {format === option.id && <Check size={17} className="text-[#ed7355]" />}
        </Button>)}
      </div>
      {format === 'pdf' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notesPages} disabled={busy} onChange={event => setNotesPages(event.target.checked)} />Include speaker notes pages</label>}
      {format === 'png' && <div className="grid grid-cols-3 gap-3 text-sm">
        <Choice label="Image format" value={imageFormat} options={[{value:'png',label:'PNG'},{value:'jpeg',label:'JPEG'}]} onChange={setImageFormat}/>
        <Choice label="Slides" value={imageScope} options={[{value:'all',label:'All slides'},{value:'current',label:'Current slide'}]} onChange={setImageScope}/>
        <Choice label="Resolution" value={String(imageScale)} options={[{value:'1',label:'1×'},{value:'2',label:'2×'},{value:'3',label:'3×'},{value:'4',label:'4×'}]} onChange={value=>setImageScale(Number(value))}/>
      </div>}
      <p className="text-xs leading-relaxed text-muted-foreground">{format === 'pptx' ? 'Native PowerPoint objects remain editable. Some gradients, image effects, animations, and rich text details may look different.' : format === 'project' ? 'Includes your slides, speaker notes, theme, and embedded image assets. Import it to keep editing.' : format === 'pdf' && notesPages ? 'Print-ready pages with each slide and its speaker notes. Long notes continue on additional pages.' : 'Exports include skipped slides. Animations are not included; speaker notes are available with PDF notes pages.'}</p>
      <DialogFooter className="-mx-6 -mb-6 mt-1 p-4"><Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="bg-[#ed7355] text-white hover:bg-[#dc6446]" disabled={busy} onClick={() => void runExport()}>{busy ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}{busy ? 'Preparing export…' : 'Export presentation'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
export default ExportDialog;
