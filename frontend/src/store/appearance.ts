import { create } from 'zustand';
import { strings } from '@/strings';

/**
 * Light/dark UI scheme for the whole app. The stored choice wins; until the user picks one, the system
 * preference is followed. The `dark` class on <html> switches every shadcn variable at once.
 */
function readDark(): boolean {
  try {
    const stored = localStorage.getItem(strings.editor.folioTheme);
    if (stored) return stored === strings.common.dark;
  } catch {
    // Browser storage may be unavailable; fall back to the system preference.
  }
  // jsdom and some embedded browsers have no matchMedia.
  return typeof matchMedia === strings.store.function && matchMedia(strings.editor.prefersColorSchemeDark).matches;
}

function applyDark(dark: boolean): void {
  if (typeof document !== strings.store.undefined) document.documentElement.classList.toggle(strings.common.dark, dark);
}

const initialDark = readDark();
// Applied at import time, before the first render, so no page starts in the wrong scheme.
applyDark(initialDark);

export const useAppearance = create<{ dark: boolean; toggleDark: () => void }>((set, get) => ({
  dark: initialDark,
  toggleDark: () => {
    const dark = !get().dark;
    try {
      localStorage.setItem(strings.editor.folioTheme, dark ? strings.common.dark : strings.common.light);
    } catch {
      // The scheme still switches when browser storage is unavailable.
    }
    applyDark(dark);
    set({ dark });
  },
}));
