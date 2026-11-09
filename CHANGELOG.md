# Changelog

## Arabic interface design
- Arabic text in the interface and on slides now uses the bundled IBM Plex Sans Arabic (SIL OFL, official IBM files) instead of Amiri. It is the typeface of the Saudi DGA design system and is designed to sit beside Latin grotesques like Geist. Amiri stays selectable as the `Folio Arabic` slide font. PDF speaker notes embed Plex too.
- The Arabic interface follows Arabic UI practice: no letter-spacing (it pulls joined letters apart), the smallest labels a step larger, taller lines for paragraphs, keyboard shortcuts shown left to right at the end of menu items, notifications at the bottom left, and back/next and undo/redo icons mirrored.
- Content the app generates follows the interface language. In Arabic, new presentations, the three starter templates (cards and decks), slide layouts and new text boxes, tables and charts are written in Arabic and laid out right to left. Pasted text is aligned by its own direction.
- Every remaining English interface label, tooltip, menu, announcement and library string has an Arabic translation. Dates and times use Western digits. Arabic sentences no longer get their word order or number agreement from English fragments.
- Fixed in both languages: switching between a light and a dark theme left light literal surfaces (the starter cover, cards, white cells) under text that had turned light. Neutral tints now follow the new theme, which made the "A bold beginning" template's title readable again. In Arabic, the slideshow no longer cuts off the left quarter of the slide, an Arabic chart title starts at the right, and file extensions in the export dialog read correctly.

## shadcn theme variables everywhere
- Application styles read only the standard shadcn/ui variables, the set tweakcn.com exports, so `npx shadcn add https://tweakcn.com/r/themes/<theme>.json` restyles the whole interface. The project library, presenter view, slideshow controls, text toolbar, avatar, export dialog and settings button no longer hardcode colors, fonts, corners or shadows, and the non-standard `--canvas`, `--success`, `--shadow-color` and `--radius-xs` variables are gone.
- `index.css` defines the font, shadow and letter-spacing variables tweakcn themes provide and maps them into Tailwind, so shadcn components use the theme's shadows and fonts too.
- The light/dark choice now applies to every page from startup instead of only after the editor has opened; the library no longer stays light under dark dialogs. The slideshow stage always uses the theme's dark variables. Native controls follow the scheme through `color-scheme`.

## Friendly error messages
- Failed API calls throw `ApiError`, and `userMessage` turns any failure into a short, translated message: no connection, a server problem, a file that is too large, or otherwise what failed. Messages the app defines, such as font upload rules, are kept; status codes, URLs and server wording are never shown. Technical details stay in the browser console.
- The library, editor, font gate and font settings, image drops and pastes, export, presenter view, account avatar and crash screen use these messages, with Arabic translations. The old terse fallbacks ("Rename failed", "Import failed", …) were retired.

## Centralized runtime strings
- Expanded `src/strings.ts` into the single const-object API for all application runtime strings, backed by feature-grouped modules under `src/constants/strings/`.
- Migrated UI/accessibility copy, errors, history labels, default content, discriminants, CSS classes, routes, storage keys, colors, and template fragments; import/type/directive syntax remains literal.
- Preserved JSX entities and inline whitespace, mutable-string inference, and runtime type narrowing.
- Verified typecheck, lint, 46 unit tests, production build, browser behavior, and an AST audit with no remaining runtime string values outside the constants modules. Four E2E scenarios pass; the previously observed authoring/export-dialog timeout remains.

## Layer drag reordering
- Replaced layer up/down buttons with sortable drag handles using the existing dnd-kit stack.
- Drops update actual slide z-order through store mutations as a single undoable action; selection is preserved.
- Added keyboard pickup, movement, drop, and cancellation; editor shortcuts respect events consumed by drag sensors.
- Browser regressions cover canvas stacking order, undo/redo, persistence, and keyboard cancellation.

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
