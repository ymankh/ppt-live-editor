import { useMemo } from 'react';
import type { Announcements, ScreenReaderInstructions, UniqueIdentifier } from '@dnd-kit/core';
import { interpolate } from '@/features/localization/format';
import { useTranslation } from '@/features/localization/locale';
import { strings } from '@/strings';

/**
 * Screen-reader instructions and live announcements for a vertical sortable list, in the interface
 * language (dnd-kit's defaults are English and name items by their internal ids).
 * `ids` is the visual order; `label` names an item the way the list shows it.
 */
export function useSortableAccessibility(ids: readonly UniqueIdentifier[], label: (id: UniqueIdentifier) => string): {
  announcements: Announcements;
  screenReaderInstructions: ScreenReaderInstructions;
} {
  const t = useTranslation();
  return useMemo(() => {
    const at = (id: UniqueIdentifier) => ({ position: ids.indexOf(id) + 1, total: ids.length });
    return {
      announcements: {
        onDragStart: ({ active }) => interpolate(t(strings.editor.dragStarted), { name: label(active.id), ...at(active.id) }),
        onDragOver: ({ active, over }) => over
          ? interpolate(t(strings.editor.dragMoved), { name: label(active.id), ...at(over.id) })
          : interpolate(t(strings.editor.dragOutside), { name: label(active.id) }),
        onDragEnd: ({ active, over }) => over
          ? interpolate(t(strings.editor.dragDropped), { name: label(active.id), ...at(over.id) })
          : interpolate(t(strings.editor.dragDroppedOutside), { name: label(active.id) }),
        onDragCancel: ({ active }) => interpolate(t(strings.editor.dragCancelled), { name: label(active.id) }),
      },
      screenReaderInstructions: { draggable: t(strings.editor.dragInstructions) },
    };
  }, [ids, label, t]);
}
