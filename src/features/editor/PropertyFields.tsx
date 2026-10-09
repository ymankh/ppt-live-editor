import { Choice,ColorField,NumberField,Toggle } from '@/components/common/PropertyInputs';
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Fill, Shadow, Stroke } from "@/types/model";

export function FillControl({
  value,
  onChange,
  allowNone = true,
}: {
  value: Fill;
  onChange: (value: Fill) => void;
  allowNone?: boolean;
}) {
  const types: Fill["type"][] = allowNone
    ? ["none", "solid", "gradient", "image"]
    : ["solid", "gradient", "image"];
  return (
    <div className="property-stack">
      <Choice
        label="Fill type"
        value={value.type}
        options={types}
        onChange={(type) => {
          if (type === "none") onChange({ type });
          if (type === "solid") onChange({ type, color: "#ed7355" });
          if (type === "gradient")
            onChange({
              type,
              gradient: {
                kind: "linear",
                angle: 45,
                stops: [
                  { offset: 0, color: "#f9d8c7" },
                  { offset: 1, color: "#ed7355" },
                ],
              },
            });
          if (type === "image") onChange({ type, assetId: "", fit: "cover" });
        }}
      />
      {value.type === "solid" && (
        <ColorField
          label="Color"
          value={value.color}
          onChange={(color) => onChange({ ...value, color })}
        />
      )}
      {value.type === "gradient" && (
        <>
          <Choice
            label="Gradient"
            value={value.gradient.kind}
            options={["linear", "radial"]}
            onChange={(kind) =>
              onChange({ ...value, gradient: { ...value.gradient, kind } })
            }
          />
          <NumberField
            label="Angle"
            value={value.gradient.angle}
            onChange={(angle) =>
              onChange({ ...value, gradient: { ...value.gradient, angle } })
            }
          />
          {value.gradient.stops.map((stop, index) => (
            <div className="gradient-stop" key={index}>
              <ColorField
                label={`Stop ${index + 1}`}
                value={stop.color}
                onChange={(color) =>
                  onChange({
                    ...value,
                    gradient: {
                      ...value.gradient,
                      stops: value.gradient.stops.map((item, i) =>
                        i === index ? { ...item, color } : item,
                      ),
                    },
                  })
                }
              />
              <NumberField
                label="Position %"
                min={0}
                max={100}
                value={stop.offset * 100}
                onChange={(offset) =>
                  onChange({
                    ...value,
                    gradient: {
                      ...value.gradient,
                      stops: value.gradient.stops.map((item, i) =>
                        i === index ? { ...item, offset: offset / 100 } : item,
                      ),
                    },
                  })
                }
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remove gradient stop"
                disabled={value.gradient.stops.length <= 2}
                onClick={() =>
                  onChange({
                    ...value,
                    gradient: {
                      ...value.gradient,
                      stops: value.gradient.stops.filter((_, i) => i !== index),
                    },
                  })
                }
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                gradient: {
                  ...value.gradient,
                  stops: [
                    ...value.gradient.stops,
                    { offset: 0.5, color: "#ffffff" },
                  ].sort((a, b) => a.offset - b.offset),
                },
              })
            }
          >
            <Plus size={13} />
            Add color stop
          </Button>
        </>
      )}
      {value.type === "image" && (
        <>
          <label className="property-field">
            <span>Image URL</span>
            <Input
              value={value.assetId}
              placeholder="https://…"
              onChange={(event) =>
                onChange({ ...value, assetId: event.target.value })
              }
            />
          </label>
          <Choice
            label="Fit"
            value={value.fit}
            options={["cover", "contain", "tile"]}
            onChange={(fit) => onChange({ ...value, fit })}
          />
        </>
      )}
    </div>
  );
}
export function StrokeControl({
  value,
  onChange,
  required = false,
}: {
  value: Stroke | null;
  onChange: (value: Stroke | null) => void;
  required?: boolean;
}) {
  return (
    <div className="property-stack">
      {!required && (
        <Toggle
          label="Outline"
          value={!!value}
          onChange={(enabled) =>
            onChange(
              enabled ? { color: "#333333", width: 2, style: "solid" } : null,
            )
          }
        />
      )}
      {value && (
        <>
          <ColorField
            label="Color"
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
          />
          <div className="property-grid">
            <NumberField
              label="Width"
              value={value.width}
              min={0}
              onChange={(width) => onChange({ ...value, width })}
            />
            <Choice
              label="Style"
              value={value.style}
              options={["solid", "dashed", "dotted"]}
              onChange={(style) => onChange({ ...value, style })}
            />
          </div>
        </>
      )}
    </div>
  );
}
export function ShadowControl({
  value,
  onChange,
}: {
  value: Shadow | null;
  onChange: (value: Shadow | null) => void;
}) {
  return (
    <div className="property-stack">
      <Toggle
        label="Drop shadow"
        value={!!value}
        onChange={(enabled) =>
          onChange(
            enabled
              ? {
                  color: "#00000033",
                  blur: 20,
                  offsetX: 0,
                  offsetY: 8,
                  spread: 0,
                }
              : null,
          )
        }
      />
      {value && (
        <>
          <ColorField
            label="Color"
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
          />
          <div className="property-grid">
            {(["blur", "offsetX", "offsetY", "spread"] as const).map((key) => (
              <NumberField
                key={key}
                label={key}
                value={value[key]}
                {...(key === "blur" ? { min: 0 } : {})}
                onChange={(number) => onChange({ ...value, [key]: number })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
