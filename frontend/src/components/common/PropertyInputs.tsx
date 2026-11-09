import { useEffect,useState,type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { HexColorPicker } from 'react-colorful';
import { Popover,PopoverContent,PopoverTrigger } from '@/components/ui/popover';
import { strings } from "@/strings";
import { isString } from "@/lib/typeGuards";
import { useTranslation } from '@/features/localization/locale';

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const t = useTranslation();
  return (
    <section className={strings.inputs.propertySection}>
      <h3>{t(title)}</h3>
      {children}
    </section>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const t = useTranslation();
  const [draft, setDraft] = useState(String(Number(value.toFixed(2))));
  useEffect(() => setDraft(String(Number(value.toFixed(2)))), [value]);
  const commit = () => {
    const number = Number(draft);
    if (draft.trim() && Number.isFinite(number))
      onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, number)));
    else setDraft(String(value));
  };
  return (
    <label className={strings.common.propertyField}>
      <span>{t(label)}</span>
      <Input
        aria-label={t(label)}
        type={strings.common.number}
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === strings.common.enter) event.currentTarget.blur();
          if (event.key === strings.common.escape) {
            setDraft(String(value));
            event.preventDefault();event.stopPropagation();
          }
          if (
            event.shiftKey &&
            (event.key === strings.common.arrowUp_12204d1d || event.key === strings.common.arrowDown_9660fb86)
          ) {
            event.preventDefault();
            setDraft(
              String(
                (Number(draft) || 0) +
                  (event.key === strings.common.arrowUp_12204d1d ? 1 : -1) * step * 10,
              ),
            );
          }
        }}
      />
    </label>
  );
}
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[] | readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const t = useTranslation();
  const items = options.map((option) => isString(option)
    ? { value: option, label: t(option) }
    : { value: option.value, label: t(option.label) });
  return (
    <label className={strings.common.propertyField}>
      <span>{t(label)}</span>
      <Select
        value={value}
        items={items}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
      >
        <SelectTrigger aria-label={t(label)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslation();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className={strings.common.propertyField}>
      <span>{t(label)}</span>
      <div className={strings.inputs.colorField}>
        <Popover
          onOpenChange={(open) => {
            if (!open && draft !== value) onChange(draft);
          }}
        >
          <PopoverTrigger
            aria-label={`${t(label)} ${t('picker')}`}
            style={{
              background: value,
              width: 23,
              height: 23,
              borderRadius: strings.inputs.swatchRadius,
              border: strings.inputs.swatchBorder,
            }}
          />
          <PopoverContent className={strings.inputs.wAutoP3}>
            <HexColorPicker color={draft} onChange={setDraft} />
            <div className={strings.inputs.flexGap2Pt3}>
              {[
                strings.inputs.colored795b,
                strings.common.colorf7eee6,
                strings.common.colorffffff,
                strings.inputs.color292b2b,
                strings.inputs.colorded7ee,
                strings.inputs.colord8e4d5,
              ].map((color) => (
                <button
                  key={color}
                  aria-label={`${t('Use')} ${color}`}
                  onClick={() => setDraft(color)}
                  style={{
                    background: color,
                    width: 24,
                    height: 24,
                    borderRadius: strings.inputs.swatchRadius,
                    border: strings.inputs.swatchBorder,
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Input
          aria-label={t(label)}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (CSS.supports(strings.common.color, draft)) onChange(draft);
            else setDraft(value);
          }}
          onKeyDown={(event) => {
            if (event.key === strings.common.enter) event.currentTarget.blur();
          }}
        />
      </div>
    </div>
  );
}
export function Toggle({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const t = useTranslation();
  return (
    <Button
      size={strings.common.sm}
      variant={value ? strings.common.secondary : strings.common.outline}
      className={value ? strings.inputs.propertyToggleActive : strings.inputs.propertyToggle}
      aria-pressed={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
    >
      {t(label)}
    </Button>
  );
}
