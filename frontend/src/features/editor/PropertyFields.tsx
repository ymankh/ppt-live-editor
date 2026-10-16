import { Choice,ColorField,NumberField,Toggle } from '@/components/common/PropertyInputs';
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Fill, Shadow, Stroke } from "@/types/model";
import { strings } from "@/strings";


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
    ? [strings.common.none, strings.common.solid, strings.common.gradient, strings.common.image]
    : [strings.common.solid, strings.common.gradient, strings.common.image];
  return (
    <div className={strings.editor.propertyStack}>
      <Choice
        label={strings.editor.fillType}
        value={value.type}
        options={types}
        onChange={(type) => {
          if (type === strings.common.none) onChange({ type });
          if (type === strings.common.solid) onChange({ type, color: strings.common.colored7355 });
          if (type === strings.common.gradient)
            onChange({
              type,
              gradient: {
                kind: strings.common.linear,
                angle: 45,
                stops: [
                  { offset: 0, color: strings.editor.colorf9d8c7 },
                  { offset: 1, color: strings.common.colored7355 },
                ],
              },
            });
          if (type === strings.common.image) onChange({ type, assetId: strings.common.empty, fit: strings.common.cover });
        }}
      />
      {value.type === strings.common.solid && (
        <ColorField
          label={strings.editor.color_6b73191a}
          value={value.color}
          onChange={(color) => onChange({ ...value, color })}
        />
      )}
      {value.type === strings.common.gradient && (
        <>
          <Choice
            label={strings.editor.gradient}
            value={value.gradient.kind}
            options={[strings.common.linear, strings.common.radial]}
            onChange={(kind) =>
              onChange({ ...value, gradient: { ...value.gradient, kind } })
            }
          />
          <NumberField
            label={strings.editor.angle}
            value={value.gradient.angle}
            onChange={(angle) =>
              onChange({ ...value, gradient: { ...value.gradient, angle } })
            }
          />
          {value.gradient.stops.map((stop, index) => (
            <div className={strings.editor.gradientStop} key={index}>
              <ColorField
                label={`${strings.editor.stop}${index + 1}`}
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
                label={strings.editor.position}
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
                variant={strings.common.ghost}
                size={strings.common.iconSm}
                aria-label={strings.editor.removeGradientStop}
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
            variant={strings.common.outline}
            size={strings.common.sm}
            onClick={() =>
              onChange({
                ...value,
                gradient: {
                  ...value.gradient,
                  stops: [
                    ...value.gradient.stops,
                    { offset: 0.5, color: strings.common.colorffffff },
                  ].sort((a, b) => a.offset - b.offset),
                },
              })
            }
          >
            <Plus size={13} />{strings.editor.addColorStop}</Button>
        </>
      )}
      {value.type === strings.common.image && (
        <>
          <label className={strings.common.propertyField}>
            <span>{strings.editor.imageURL}</span>
            <Input
              value={value.assetId}
              placeholder={strings.editor.https_ab04e20e}
              onChange={(event) =>
                onChange({ ...value, assetId: event.target.value })
              }
            />
          </label>
          <Choice
            label={strings.editor.fit}
            value={value.fit}
            options={[strings.common.cover, strings.common.contain, strings.common.tile]}
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
    <div className={strings.editor.propertyStack}>
      {!required && (
        <Toggle
          label={strings.editor.outline}
          value={!!value}
          onChange={(enabled) =>
            onChange(
              enabled ? { color: strings.common.color333333, width: 2, style: strings.common.solid } : null,
            )
          }
        />
      )}
      {value && (
        <>
          <ColorField
            label={strings.editor.color_6b73191a}
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
          />
          <div className={strings.editor.propertyGrid}>
            <NumberField
              label={strings.editor.width_3019947b}
              value={value.width}
              min={0}
              onChange={(width) => onChange({ ...value, width })}
            />
            <Choice
              label={strings.editor.style_7e744141}
              value={value.style}
              options={[strings.common.solid, strings.common.dashed, strings.common.dotted]}
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
    <div className={strings.editor.propertyStack}>
      <Toggle
        label={strings.editor.dropShadow}
        value={!!value}
        onChange={(enabled) =>
          onChange(
            enabled
              ? {
                  color: strings.editor.color00000033,
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
            label={strings.editor.color_6b73191a}
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
          />
          <div className={strings.editor.propertyGrid}>
            {([strings.common.blur, strings.editor.offsetX, strings.editor.offsetY, strings.editor.spread] as const).map((key) => (
              <NumberField
                key={key}
                label={key}
                value={value[key]}
                {...(key === strings.common.blur ? { min: 0 } : {})}
                onChange={(number) => onChange({ ...value, [key]: number })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
