import { useState } from "react";
import { nanoid } from "nanoid";
import { useEditor } from "@/store/editor";
import { applyTheme } from "./applyTheme";
import { ColorField } from '@/components/common/PropertyInputs';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export function ThemeEditor() {
  const current = useEditor((s) => s.document.theme);
  const [draft, setDraft] = useState(() => structuredClone(current));
  const [editing, setEditing] = useState(false);
  if (!editing)
    return (
      <Button
        variant="outline"
        onClick={() => {
          setDraft(structuredClone(current));
          setEditing(true);
        }}
      >
        Create a custom theme
      </Button>
    );
  return (
    <div className="space-y-3 border-t pt-4">
      <Input
        aria-label="Theme name"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        {(["background", "text", "primary", "secondary"] as const).map(
          (key) => (
            <ColorField
              key={key}
              label={key}
              value={draft.colors[key]}
              onChange={(color) =>
                setDraft({
                  ...draft,
                  colors: { ...draft.colors, [key]: color },
                })
              }
            />
          ),
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          aria-label="Heading font"
          value={draft.fonts.heading}
          onChange={(e) =>
            setDraft({
              ...draft,
              fonts: { ...draft.fonts, heading: e.target.value },
            })
          }
        />
        <Input
          aria-label="Body font"
          value={draft.fonts.body}
          onChange={(e) =>
            setDraft({
              ...draft,
              fonts: { ...draft.fonts, body: e.target.value },
            })
          }
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            const theme = { ...draft, id: nanoid() };
            useEditor
              .getState()
              .mutate("Apply custom theme", (doc) => applyTheme(doc, theme));
            localStorage.setItem(
              `folio-custom-theme-${theme.id}`,
              JSON.stringify(theme),
            );
            setEditing(false);
            toast.success("Custom theme saved");
          }}
        >
          Save & apply
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
