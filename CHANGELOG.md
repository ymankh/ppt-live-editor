# Changelog

## Panel resize correction
- Sidebars now fill the width and height of their resizable panels instead of retaining fixed content widths.
- Slide thumbnails resize with the sidebar using measured container width and the shared renderer.
- Added a browser regression covering both sidebar dividers, thumbnail expansion, full-height content, and persisted sizes after reload.

## 2026-10-09 — Folio presentation workspace

### 0 — Application foundation
- React/Vite/strict TypeScript, Tailwind v4, CLI-generated shadcn components, routing, dark mode, pnpm lockfile, ESLint/Prettier, Vitest, and Playwright.

### 1 — Typed document and actions
- Six-member element union, recursive TipTap JSON, runtime Zod import validation, command registry, patch-based history, transaction support, selection restoration, and a 200-entry limit.

### 2 — Canvas
- Shared DOM/SVG slide renderer, transient pointer geometry, rotation-aware resizing, marquee, group transforms, snapping, grid/rulers, wheel zoom, keyboard cycling, pan, and drawing tools.

### 3 — Core elements
- TipTap text editing, all shape paths, connectors/arrowheads, image upload/drop/paste, numeric crop/filter controls, and contextual inspector.

### 4 — Arrange and clipboard
- Z-order, align/distribute, match dimensions, grouping, locking, flips, layers, internal/system JSON clipboard, context menus, command palette, and generated shortcut help.

### 5 — Slides
- Sortable multi-select slide list, viewport-virtualized/debounced thumbnails, eight layouts, backgrounds, transitions, and rich speaker notes.

### 6 — Tables and charts
- Editable table cells, row/column insertion/deletion/sizing, merge/split spreadsheet, chart data spreadsheet, seven chart variants, and chart options.

### 7 — Themes and motion
- Six built-in themes, custom theme editing, theme recoloring, per-element animation settings, and player animation/transition runtime.

### 8 — Presentation
- Audience player, skipped slides, build navigation, overview, number jumps, black/white screen, laser/ink, auto-advance, and synchronized presenter notes/timer/next-slide view.

### 9 — Interchange
- Validated embedded-asset `.pptjson` archives, native PPTX export/basic import, PDF with optional notes pages, and current/all PNG/JPEG exports at configurable resolution.

### 10 — Local projects
- IndexedDB repository interface, serialized debounced autosave/startup restore, settings storage, project templates/search/rename/duplicate/delete/import, and safe deletion-time asset garbage collection.

### 11 — Verification and polish
- Editorial cream/coral default deck, light/dark workspace, visible keyboard focus, recommended accessibility lint, production bundle splitting, and documented architecture/export boundaries.
- Passed strict typecheck, lint, 46 unit/component tests, two browser workflows, and production build.
- Browser smoke observed no console errors while exercising production menus, themes, grid, exports dialog, and slideshow overview/navigation.

These milestone headings record delivered work, not a claim that every item in the original exhaustive specification is complete. Remaining feature boundaries are explicitly listed in README.md.
