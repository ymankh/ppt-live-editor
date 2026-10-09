import type { Fill, Presentation, Theme } from "@/types/model";
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
  const recolor = (color: string) => palette.get(color) ?? color;
  const fill = (value: Fill) => {
    if (value.type === "solid") value.color = recolor(value.color);
    if (value.type === "gradient")
      value.gradient.stops.forEach((stop) => {
        stop.color = recolor(stop.color);
      });
  };
  for (const slide of document.slides) {
    fill(slide.background);
    for (const element of slide.elements) {
      switch (element.type) {
        case "text":
          fill(element.fill);
          element.color = recolor(element.color);
          element.fontFamily =
            element.fontSize > 64 ? theme.fonts.heading : theme.fonts.body;
          if (element.stroke)
            element.stroke.color = recolor(element.stroke.color);
          break;
        case "shape":
          fill(element.fill);
          if (element.stroke)
            element.stroke.color = recolor(element.stroke.color);
          break;
        case "line":
          element.stroke.color = recolor(element.stroke.color);
          break;
        case "image":
          if (element.stroke)
            element.stroke.color = recolor(element.stroke.color);
          break;
        case "table":
          fill(element.style.headerFill);
          element.rows.forEach((row) =>
            row.cells.forEach((cell) => fill(cell.fill)),
          );
          break;
        case "chart":
          element.series.forEach((series) => {
            series.color = recolor(series.color);
          });
          break;
        default: {
          const exhaustive: never = element;
          throw new Error(`Unsupported element ${String(exhaustive)}`);
        }
      }
    }
  }
  document.theme = theme;
}
