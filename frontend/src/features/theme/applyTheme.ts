import type { Fill, Presentation, Theme } from "@/types/model";
import { strings } from "@/strings";

type Rgb = readonly [number, number, number];
const hexColor = /^#([0-9a-f]{6})$/i;
const parseColor = (color: string): Rgb | null => {
  const value = hexColor.exec(color.trim())?.[1];
  if (!value) return null;
  const channels = Number.parseInt(value, 16);
  return [(channels >> 16) & 255, (channels >> 8) & 255, channels & 255];
};
const formatColor = (color: Rgb): string =>
  `#${color.map((channel) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0")).join("")}`;
const subtract = (a: Rgb, b: Rgb): Rgb => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Rgb, factor: number): Rgb => [a[0] * factor, a[1] * factor, a[2] * factor];
const dot = (a: Rgb, b: Rgb): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const luminance = ([red, green, blue]: Rgb): number => {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
};
/** Colors further than this (in sRGB units) from the background–text line are deliberate and kept. */
const neutralTolerance = 24;

/**
 * Literal colors normally survive a theme change. Switching between a light and a dark theme would
 * leave light literal surfaces (cream slides, cards, white cells) under text that turned light, so
 * neutral tints between the old background and text keep their relative position in the new theme.
 */
function neutralTints(previous: Theme, next: Theme): (color: string) => string | undefined {
  const from = parseColor(previous.colors.background), fromText = parseColor(previous.colors.text);
  const to = parseColor(next.colors.background), toText = parseColor(next.colors.text);
  if (!from || !fromText || !to || !toText) return () => undefined;
  const isDark = (background: Rgb, text: Rgb) => luminance(background) < luminance(text);
  const axis = subtract(fromText, from), length = dot(axis, axis), range = subtract(toText, to);
  if (isDark(from, fromText) === isDark(to, toText) || length < 1) return () => undefined;
  return (color) => {
    const value = parseColor(color);
    if (!value) return undefined;
    const offset = subtract(value, from), position = dot(offset, axis) / length;
    const residual = subtract(offset, scale(axis, position));
    if (Math.sqrt(dot(residual, residual)) > neutralTolerance || position < -0.25 || position > 1.25) return undefined;
    const tint = scale(range, position);
    return formatColor([to[0] + tint[0], to[1] + tint[1], to[2] + tint[2]]);
  };
}

export function applyTheme(document: Presentation, theme: Theme): void {
  const previous = document.theme;
  const palette = new Map<string, string>([
    [previous.colors.background, theme.colors.background],
    [previous.colors.text, theme.colors.text],
    [previous.colors.primary, theme.colors.primary],
    [previous.colors.secondary, theme.colors.secondary],
    ...previous.colors.accent.map((color, i): [string, string] => [
      color,
      theme.colors.accent[i] ?? theme.colors.primary,
    ]),
  ]);
  const tint = neutralTints(previous, theme);
  const recolor = (color: string) => palette.get(color) ?? tint(color) ?? color;
  const fill = (value: Fill) => {
    if (value.type === strings.common.solid) value.color = recolor(value.color);
    if (value.type === strings.common.gradient)
      value.gradient.stops.forEach((stop) => {
        stop.color = recolor(stop.color);
      });
  };
  for (const slide of document.slides) {
    fill(slide.background);
    for (const element of slide.elements) {
      switch (element.type) {
        case strings.common.text:
          fill(element.fill);
          element.color = recolor(element.color);
          element.fontFamily =
            element.fontSize > 64 ? theme.fonts.heading : theme.fonts.body;
          if (element.stroke)
            element.stroke.color = recolor(element.stroke.color);
          break;
        case strings.common.shape:
          fill(element.fill);
          if (element.stroke)
            element.stroke.color = recolor(element.stroke.color);
          break;
        case strings.common.line:
          element.stroke.color = recolor(element.stroke.color);
          break;
        case strings.common.image:
          if (element.stroke)
            element.stroke.color = recolor(element.stroke.color);
          break;
        case strings.common.table:
          fill(element.style.headerFill);
          element.rows.forEach((row) =>
            row.cells.forEach((cell) => fill(cell.fill)),
          );
          break;
        case strings.common.chart:
          element.series.forEach((series) => {
            series.color = recolor(series.color);
          });
          break;
        default: {
          const exhaustive: never = element;
          throw new Error(`${strings.theme.unsupportedElement}${String(exhaustive)}`);
        }
      }
    }
  }
  document.theme = theme;
}
