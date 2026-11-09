import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { userMessage } from '@/features/errors/userMessage';
import { useTranslation } from '@/features/localization/locale';
import { useEditor } from '@/store/editor';
import { strings } from '@/strings';
import { isFontAvailable, useAvailableFontFamilies, useFontRegistry } from './registry';
import { fontFamilyKey, missingFontFamilies, replaceFontFamilies } from './missingFonts';

/** Load route documents and durable fonts before mounting any slide renderer or export UI. */
export function PresentationFontGate({ children }: { children: ReactNode }) {
  const t = useTranslation();
  const navigate = useNavigate();
  const { projectId, id } = useParams();
  const targetId = projectId ?? id;
  const routeKey = targetId ?? 'restore';
  const ready = useFontRegistry(state => state.ready);
  const documentId = useEditor(state => state.document.id);
  const openRevision = useEditor(state => state.openRevision);
  const [loadedRoute, setLoadedRoute] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    // Names what was loading when a failure happens, so the message can say what failed.
    let failure: string = strings.errors.loadPresentationFonts;
    setError(null);
    setLoadedRoute(null);
    const load = async () => {
      await useFontRegistry.getState().initialize();
      if (cancelled) return;
      failure = targetId ? strings.errors.openPresentation : strings.errors.openLatestPresentation;
      if (targetId) {
        if (useEditor.getState().document.id !== targetId) await useEditor.getState().loadProject(targetId);
      } else await useEditor.getState().restoreProject();
      if (!cancelled) setLoadedRoute(routeKey);
    };
    void load().catch((cause: unknown) => {
      console.error(cause);
      if (!cancelled) setError(userMessage(cause, failure));
    });
    return () => { cancelled = true; };
  }, [targetId, routeKey, attempt]);
  const back = () => { void navigate('/projects'); };
  if (error) return <main className="grid min-h-screen place-content-center gap-4 p-8">
    <h1 className="text-xl font-semibold">{t('Unable to open presentation')}</h1>
    <p role="alert">{t(error)}</p>
    <div className="flex gap-2"><Button onClick={() => setAttempt(value => value + 1)}>{t('Try again')}</Button><Button variant="outline" onClick={back}>{t('Back to library')}</Button></div>
  </main>;
  if (!ready || loadedRoute !== routeKey || (targetId && targetId !== documentId)) return <main className="grid min-h-screen place-content-center p-8"><p role="status">{t('Loading presentation and fonts…')}</p></main>;
  return <FontResolutionSession key={`${documentId}:${openRevision}`} onBack={back}>{children}</FontResolutionSession>;
}

function FontResolutionSession({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  const t = useTranslation();
  const families = useAvailableFontFamilies();
  const fonts = useFontRegistry(state => state.fonts);
  const [missing] = useState(() => missingFontFamilies(useEditor.getState().document, isFontAvailable));
  const [replacements, setReplacements] = useState<Record<string, string>>({});
  const [resolved, setResolved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Reading fonts subscribes to successful uploads, including registrations from another font UI.
  const uploaded = new Set(fonts.map(font => fontFamilyKey(font.family)));
  const unresolved = missing.filter(family => !uploaded.has(fontFamilyKey(family)) && !isFontAvailable(family));
  if (!missing.length || resolved) return children;
  const complete = unresolved.every(family => replacements[family] && isFontAvailable(replacements[family]));
  const apply = () => {
    if (!complete || uploading) return;
    const changes: Record<string, string> = {};
    for (const family of unresolved) {
      const replacement = replacements[family];
      if (!replacement) return;
      changes[family] = replacement;
    }
    useEditor.getState().mutate('Replace missing fonts', draft => replaceFontFamilies(draft, changes));
    setResolved(true);
  };
  return <Dialog open onOpenChange={(open, details) => { if (!open) details.cancel(); }}>
    <DialogContent showCloseButton={false} className="max-h-[90dvh] w-[min(40rem,94vw)] overflow-y-auto" onKeyDown={event => event.stopPropagation()}>
      <DialogHeader>
        <DialogTitle>{t('Resolve missing fonts')}</DialogTitle>
        <DialogDescription>{t('This presentation uses fonts that are not available on this device. Upload each font or choose a replacement before continuing. No fonts will be replaced without your approval.')}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 p-4">
        {missing.map((family, index) => {
          const available = !unresolved.includes(family);
          const selectId = `missing-font-${index}`;
          return <fieldset key={family} className="grid gap-3 rounded-lg border p-3" disabled={uploading !== null}>
            <legend className="px-1 font-semibold" dir="auto">{family}</legend>
            {available ? <p role="status" className="text-sm">{t('Font uploaded and ready')}</p> : <>
              <label htmlFor={selectId} className="text-sm">{t('Replace with')}</label>
              <select id={selectId} className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={replacements[family] ?? ''} onChange={event => setReplacements(value => ({ ...value, [family]: event.target.value }))}>
                <option value="">{t('Choose an available font')}</option>
                {families.filter(candidate => fontFamilyKey(candidate) !== fontFamilyKey(family)).map(candidate => <option key={candidate} value={candidate}>{candidate}</option>)}
              </select>
              <label className="grid gap-2 text-sm">{t('Or upload this font (.ttf, .otf, .woff, .woff2)')}
                <input type="file" accept=".ttf,.otf,.woff,.woff2" aria-label={`${t('Upload font')}: ${family}`} onChange={event => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  setError(null);
                  setUploading(family);
                  void useFontRegistry.getState().uploadFont(file, family).catch((cause: unknown) => {
                    console.error(cause);
                    setError(userMessage(cause, strings.errors.uploadFont));
                  }).finally(() => setUploading(null));
                }} />
              </label>
            </>}
          </fieldset>;
        })}
        {uploading && <p role="status">{t('Uploading font…')} <span dir="auto">{uploading}</span></p>}
        {error && <p role="alert" className="text-destructive">{t(error)}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" disabled={uploading !== null} onClick={onBack}>{t('Back to library')}</Button>
        <Button disabled={!complete || uploading !== null} onClick={apply}>{t('Apply and continue')}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
