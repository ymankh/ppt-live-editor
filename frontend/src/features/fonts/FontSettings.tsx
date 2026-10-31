import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/features/localization/locale';
import { useFontRegistry } from './registry';

export function FontSettings() {
  const t = useTranslation();
  const fonts = useFontRegistry(state => state.fonts);
  const ready = useFontRegistry(state => state.ready);
  const error = useFontRegistry(state => state.error);
  const initialize = useFontRegistry(state => state.initialize);
  const uploadFont = useFontRegistry(state => state.uploadFont);
  const familyId = useId();
  const fileId = useId();
  const helpId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [family, setFamily] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  useEffect(() => { void initialize().catch(() => undefined); }, [initialize]);

  return <section className="grid gap-3 border-t p-4" aria-labelledby={`${familyId}-heading`}>
    <h3 id={`${familyId}-heading`} className="text-sm font-semibold">{t('Font library')}</h3>
    <p id={helpId} className="text-sm text-muted-foreground">{t('Upload a font for this app. Use its exact family name to resolve missing presentation fonts. TTF, OTF, WOFF, and WOFF2 files up to 20 MiB are supported.')}</p>
    <form className="grid gap-3" onSubmit={event => {
      event.preventDefault();
      if (!file || uploading) return;
      setUploading(true);
      setUploaded(false);
      void uploadFont(file, family).then(() => {
        setFamily('');
        setFile(null);
        if (fileInput.current) fileInput.current.value = '';
        setUploaded(true);
      }).catch(() => undefined).finally(() => setUploading(false));
    }}>
      <label htmlFor={familyId} className="text-sm font-medium">{t('Font family name')}</label>
      <Input id={familyId} value={family} required maxLength={200} disabled={uploading} aria-describedby={helpId} onChange={event => { setFamily(event.target.value); setUploaded(false); }} />
      <label htmlFor={fileId} className="text-sm font-medium">{t('Font file')}</label>
      <Input id={fileId} ref={fileInput} type="file" accept=".ttf,.otf,.woff,.woff2" required disabled={uploading} aria-describedby={helpId} onChange={event => { setFile(event.target.files?.[0] ?? null); setUploaded(false); }} />
      <Button type="submit" disabled={uploading || !ready || !family.trim() || !file}>{t(uploading ? 'Uploading font…' : 'Upload font')}</Button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
    {!ready && <div className="flex items-center gap-2"><p role="status" className="text-sm text-muted-foreground">{t(error ? 'The font library could not be loaded.' : 'Loading fonts…')}</p>{error && <Button type="button" variant="outline" onClick={() => { void initialize().catch(() => undefined); }}>{t('Try again')}</Button>}</div>}
    {uploaded && <p role="status" className="text-sm">{t('Font uploaded and ready to use.')}</p>}
    {ready && (fonts.length ? <ul aria-label={t('Uploaded fonts')} className="grid gap-2 text-sm">{fonts.map(font => <li key={font.id} className="rounded-md border p-2" style={{ fontFamily: JSON.stringify(font.family) }}>{font.family}</li>)}</ul> : <p className="text-sm text-muted-foreground">{t('No fonts uploaded yet.')}</p>)}
  </section>;
}
