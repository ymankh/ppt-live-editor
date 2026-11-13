import { useTranslation } from '@/features/localization/locale';
import { Check } from "lucide-react";
import { useEditor } from "@/store/editor";
import { commands, isEnabled } from "@/features/commands/registry";
import { themes } from "@/lib/defaults";
import { applyTheme } from "@/features/theme/applyTheme";
import { ThemeEditor } from '@/features/theme/ThemeEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { strings } from "@/strings";
import { formatShortcut } from '@/lib/shortcuts';

interface Props {
  palette: boolean;
  setPalette: (v: boolean) => void;
  help: boolean;
  setHelp: (v: boolean) => void;
  themeOpen: boolean;
  setThemeOpen: (v: boolean) => void;
}
export function ShellDialogs({
  palette,
  setPalette,
  help,
  setHelp,
  themeOpen,
  setThemeOpen,
}: Props) {
  const t = useTranslation();
  const document = useEditor((s) => s.document);
  return (
    <>
      <Dialog open={palette} onOpenChange={setPalette}>
        <DialogContent className={strings.editor.commandDialog}>
          <DialogHeader className={strings.common.srOnly}>
            <DialogTitle>{t(strings.editor.commandPalette)}</DialogTitle>
            <DialogDescription>{t(strings.editor.searchPresentationActions)}</DialogDescription>
          </DialogHeader>
          <Command label={t(strings.editor.searchPresentationActions)}>
            <CommandInput placeholder={t(strings.editor.whatWouldYouLikeToDo)} />
            <CommandList label={t(strings.ui.commandSuggestions)}>
              <CommandEmpty>{t(strings.editor.noMatchingActions)}</CommandEmpty>
              <CommandGroup heading={t(strings.editor.actions)}>
                {commands.map((c) => (
                  <CommandItem
                    key={c.id}
                    disabled={!isEnabled(c)}
                    onSelect={() => {
                      c.run();
                      setPalette(false);
                    }}
                  >
                    {t(c.label)}
                    <CommandShortcut>{formatShortcut(c.shortcut)}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading={t(strings.editor.goToSlide)}>
                {document.slides.map((s, i) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => {
                      useEditor.getState().setActiveSlide(s.id);
                      setPalette(false);
                    }}
                  >{t(strings.common.slide_ff1e0604)}{i + 1}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className={strings.editor.shortcutsDialog}>
          <DialogHeader>
            <DialogTitle>{t(strings.editor.makeYourselfAtHome)}</DialogTitle>
            <DialogDescription>{t(strings.editor.aFewShortcutsToKeepYourIdeasMoving)}</DialogDescription>
          </DialogHeader>
          <div className={strings.editor.shortcutGrid}>
            {commands
              .filter((c) => c.shortcut)
              .map((c) => (
                <div key={c.id}>
                  <span>{t(c.label)}</span>
                  <kbd>{formatShortcut(c.shortcut)}</kbd>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={themeOpen} onOpenChange={setThemeOpen}>
        <DialogContent className={strings.editor.themesDialog}>
          <DialogHeader>
            <DialogTitle>{t(strings.editor.aFreshPerspective)}</DialogTitle>
            <DialogDescription>{t(strings.editor.chooseAPaletteForYourEntirePresentation)}</DialogDescription>
          </DialogHeader>
          <div className={strings.editor.themeGrid}>
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  useEditor
                    .getState()
                    .mutate(strings.editor.changeTheme, (d) => applyTheme(d, theme));
                  setThemeOpen(false);
                }}
              >
                <div
                  style={{
                    background: theme.colors.background,
                    color: theme.colors.text,
                  }}
                >
                  <b>{t(strings.editor.aa)}</b>
                  <span>
                    {theme.colors.accent.map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </span>
                </div>
                <p>
                  {t(theme.name)}
                  {document.theme.id === theme.id && <Check size={14} />}
                </p>
              </button>
            ))}
          </div>
          <ThemeEditor/>
        </DialogContent>
      </Dialog>
    </>
  );
}
