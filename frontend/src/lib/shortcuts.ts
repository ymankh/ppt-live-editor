import { strings } from '@/strings';

const applePlatform = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * Formats a registry shortcut such as `Ctrl+Shift+Z` for the current platform:
 * `⌘⇧Z` on Apple devices, unchanged elsewhere. Every place that shows a shortcut uses this.
 */
export function formatShortcut(shortcut: string | undefined, apple: boolean = applePlatform): string {
  if (!shortcut) return strings.common.empty;
  if (!apple) return shortcut;
  return shortcut
    .replace(strings.shortcuts.ctrl, strings.shortcuts.command)
    .replace(strings.shortcuts.shift, strings.shortcuts.shiftSymbol)
    .replace(strings.shortcuts.alt, strings.shortcuts.option);
}
