import { useId, useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocale, useTranslation } from './locale';
import { FontSettings } from '@/features/fonts/FontSettings';

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslation();
  const locale = useLocale((state) => state.locale);
  const setLocale = useLocale((state) => state.setLocale);
  const languageId = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Settings')}</DialogTitle>
          <DialogDescription>{t('Choose the language used for the app interface.')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 p-4">
          <label htmlFor={languageId} className="text-sm font-medium">{t('Language')}</label>
          <select
            id={languageId}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={locale}
            onChange={(event) => setLocale(event.target.value === 'ar' ? 'ar' : 'en')}
          >
            <option value="en" lang="en">English</option>
            <option value="ar" lang="ar">العربية</option>
          </select>
          <p className="text-sm text-muted-foreground">{t('Language changes only the interface, not your presentation.')}</p>
        </div>
        <FontSettings />
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('Done')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsButton({ className }: { className?: string }) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} type="button" aria-label={t('Settings')} title={t('Settings')} onClick={() => setOpen(true)}>
        <Settings size={18} aria-hidden="true" />
      </button>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
