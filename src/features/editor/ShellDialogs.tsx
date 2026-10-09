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
        <DialogContent className="command-dialog">
          <DialogHeader className="sr-only">
            <DialogTitle>Command palette</DialogTitle>
            <DialogDescription>Search presentation actions</DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="What would you like to do?" />
            <CommandList>
              <CommandEmpty>No matching actions.</CommandEmpty>
              <CommandGroup heading="Actions">
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
              <CommandGroup heading="Go to slide">
                {document.slides.map((s, i) => (
                  <CommandItem
                    key={s.id}
                    onSelect={() => {
                      useEditor.getState().setActiveSlide(s.id);
                      setPalette(false);
                    }}
                  >
                    Slide {i + 1}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="shortcuts-dialog">
          <DialogHeader>
            <DialogTitle>Make yourself at home</DialogTitle>
            <DialogDescription>
              A few shortcuts to keep your ideas moving.
            </DialogDescription>
          </DialogHeader>
          <div className="shortcut-grid">
            {commands
              .filter((c) => c.shortcut)
              .map((c) => (
                <div key={c.id}>
                  <span>{c.label}</span>
                  <kbd>{c.shortcut?.replace("Ctrl", "⌘")}</kbd>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={themeOpen} onOpenChange={setThemeOpen}>
        <DialogContent className="themes-dialog">
          <DialogHeader>
            <DialogTitle>A fresh perspective</DialogTitle>
            <DialogDescription>
              Choose a palette for your entire presentation.
            </DialogDescription>
          </DialogHeader>
          <div className="theme-grid">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  useEditor
                    .getState()
                    .mutate("Change theme", (d) => applyTheme(d, theme));
                  setThemeOpen(false);
                }}
              >
                <div
                  style={{
                    background: theme.colors.background,
                    color: theme.colors.text,
                  }}
                >
                  <b>Aa</b>
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
