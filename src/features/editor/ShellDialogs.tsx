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
  const document = useEditor((s) => s.document);
  return (
    <>
      <Dialog open={palette} onOpenChange={setPalette}>
        <DialogContent className={strings.editor.commandDialog}>
          <DialogHeader className={strings.common.srOnly}>
            <DialogTitle>{strings.editor.commandPalette}</DialogTitle>
            <DialogDescription>{strings.editor.searchPresentationActions}</DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder={strings.editor.whatWouldYouLikeToDo} />
            <CommandList>
              <CommandEmpty>{strings.editor.noMatchingActions}</CommandEmpty>
              <CommandGroup heading={strings.editor.actions}>
                {commands.map((c) => (
                  <CommandItem
                    key={c.id}
                    disabled={!isEnabled(c)}
                    onSelect={() => {
                      c.run();
                      setPalette(false);
                    }}
                  >
                    {c.label}
                    <CommandShortcut>{c.shortcut}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading={strings.editor.goToSlide}>
                {document.slides.map((s, i) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => {
                      useEditor.getState().setActiveSlide(s.id);
                      setPalette(false);
                    }}
                  >{strings.common.slide_ff1e0604}{i + 1}
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
            <DialogTitle>{strings.editor.makeYourselfAtHome}</DialogTitle>
            <DialogDescription>{strings.editor.aFewShortcutsToKeepYourIdeasMoving}</DialogDescription>
          </DialogHeader>
          <div className={strings.editor.shortcutGrid}>
            {commands
              .filter((c) => c.shortcut)
              .map((c) => (
                <div key={c.id}>
                  <span>{c.label}</span>
                  <kbd>{c.shortcut?.replace(strings.common.ctrl, strings.common.symbol_70b4b62a)}</kbd>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={themeOpen} onOpenChange={setThemeOpen}>
        <DialogContent className={strings.editor.themesDialog}>
          <DialogHeader>
            <DialogTitle>{strings.editor.aFreshPerspective}</DialogTitle>
            <DialogDescription>{strings.editor.chooseAPaletteForYourEntirePresentation}</DialogDescription>
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
                  <b>{strings.editor.aa}</b>
                  <span>
                    {theme.colors.accent.map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </span>
                </div>
                <p>
                  {theme.name}
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
