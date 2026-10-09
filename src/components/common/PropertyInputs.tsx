import { useEffect,useState,type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { HexColorPicker } from 'react-colorful';
import { Popover,PopoverContent,PopoverTrigger } from '@/components/ui/popover';
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="property-section">
      <h3>{title}</h3>
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
  const [draft, setDraft] = useState(String(Number(value.toFixed(2))));
  useEffect(() => setDraft(String(Number(value.toFixed(2)))), [value]);
  const commit = () => {
    const number = Number(draft);
    if (draft.trim() && Number.isFinite(number))
      onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, number)));
    else setDraft(String(value));
  };
  return (
    <label className="property-field">
      <span>{label}</span>
      <Input
        aria-label={label}
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(String(value));
            event.preventDefault();event.stopPropagation();
          }
          if (
            event.shiftKey &&
            (event.key === "ArrowUp" || event.key === "ArrowDown")
          ) {
            event.preventDefault();
            setDraft(
              String(
                (Number(draft) || 0) +
                  (event.key === "ArrowUp" ? 1 : -1) * step * 10,
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
  return (
    <label className="property-field">
      <span>{label}</span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) =>
            typeof option === "string" ? (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ) : (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ),
          )}
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
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="property-field">
      <span>{label}</span>
      <div className="color-field">
        <Popover
          onOpenChange={(open) => {
            if (!open && draft !== value) onChange(draft);
          }}
        >
          <PopoverTrigger
            aria-label={`${label} picker`}
            style={{
              background: value,
              width: 23,
              height: 23,
              borderRadius: 4,
              border: "1px solid #dedee3",
            }}
          />
          <PopoverContent className="w-auto p-3">
            <HexColorPicker color={draft} onChange={setDraft} />
            <div className="flex gap-2 pt-3">
              {[
                "#ed795b",
                "#f7eee6",
                "#ffffff",
                "#292b2b",
                "#ded7ee",
                "#d8e4d5",
              ].map((color) => (
                <button
                  key={color}
                  aria-label={`Use ${color}`}
                  onClick={() => setDraft(color)}
                  style={{
                    background: color,
                    width: 24,
                    height: 24,
                    borderRadius: 5,
                    border: "1px solid #ddd",
                  }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Input
          aria-label={label}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (CSS.supports("color", draft)) onChange(draft);
            else setDraft(value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
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
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Button
      size="sm"
      variant={value ? "secondary" : "outline"}
      className={value ? "property-toggle active" : "property-toggle"}
      aria-pressed={value}
      onClick={() => onChange(!value)}
    >
      {label}
    </Button>
  );
}
