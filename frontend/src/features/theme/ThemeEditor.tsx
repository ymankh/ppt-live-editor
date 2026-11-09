import { useTranslation } from '@/features/localization/locale';
import { useState } from "react";
import { nanoid } from "nanoid";
import { useEditor } from "@/store/editor";
import { applyTheme } from "./applyTheme";
import { ColorField } from '@/components/common/PropertyInputs';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { strings } from "@/strings";

export function ThemeEditor() {
  const t = useTranslation();
  const current = useEditor((s) => s.document.theme);
  // A built-in theme's name is shown in the interface language, so a custom theme starts from that name.
  const startingDraft = () => ({ ...structuredClone(current), name: t(current.name) });
  const [draft, setDraft] = useState(startingDraft);
  const [editing, setEditing] = useState(false);
  if (!editing)
    return (
      <Button
        variant={strings.common.outline}
        onClick={() => {
          setDraft(startingDraft());
          setEditing(true);
        }}
      >{t(strings.theme.createACustomTheme)}</Button>
    );
  return (
    <div className={strings.theme.spaceY3BorderTPt4}>
      <Input
        aria-label={t(strings.theme.themeName)}
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <div className={strings.theme.gridGridCols2Gap3}>
        {([strings.theme.background, strings.common.text, strings.theme.primary, strings.common.secondary] as const).map(
          (key) => (
            <ColorField
              key={key}
              label={t(key)}
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
      <div className={strings.theme.gridGridCols2Gap3}>
        <Input
          aria-label={t(strings.theme.headingFont)}
          value={draft.fonts.heading}
          onChange={(e) =>
            setDraft({
              ...draft,
              fonts: { ...draft.fonts, heading: e.target.value },
            })
          }
        />
        <Input
          aria-label={t(strings.theme.bodyFont)}
          value={draft.fonts.body}
          onChange={(e) =>
            setDraft({
              ...draft,
              fonts: { ...draft.fonts, body: e.target.value },
            })
          }
        />
      </div>
      <div className={strings.theme.flexGap2}>
        <Button
          onClick={() => {
            const theme = { ...draft, id: nanoid() };
            useEditor
              .getState()
              .mutate(strings.theme.applyCustomTheme, (doc) => applyTheme(doc, theme));
            localStorage.setItem(
              `${strings.theme.folioCustomTheme}${theme.id}`,
              JSON.stringify(theme),
            );
            setEditing(false);
            toast.success(t(strings.theme.customThemeSaved));
          }}
        >{t(strings.theme.saveApply)}</Button>
        <Button variant={strings.common.ghost} onClick={() => setEditing(false)}>{t(strings.common.cancel)}</Button>
      </div>
    </div>
  );
}
