import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { arabic } from '@/features/localization/ar';
import { translate, useLocale } from '@/features/localization/locale';
import { strings } from '@/strings';

/**
 * Whether text is one of the app's own interface messages. Every message written for people has a
 * translation, so anything outside the catalogue (server wording, browser or library errors) is treated
 * as technical detail and never shown.
 */
function isInterfaceMessage(text: string | undefined): text is string {
  return text !== undefined && Object.hasOwn(arabic, text);
}

/**
 * A short, non-technical English explanation of a failure; translate it before display.
 *
 * Server failures explain the cause when it is known (no connection, file too large, server problem)
 * and otherwise use `fallback`, which should say what failed, e.g. "We couldn't save your changes.
 * Please try again." Messages the app itself defines, such as font upload rules that the server
 * re-checks, are kept.
 */
export function userMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === undefined) return strings.errors.offline;
    if (isInterfaceMessage(error.serverMessage)) return error.serverMessage;
    if (error.status === 413) return strings.errors.tooLarge;
    if (error.status >= 500) return strings.errors.serverProblem;
    return fallback;
  }
  return error instanceof Error && isInterfaceMessage(error.message) ? error.message : fallback;
}

/** Keeps the technical error in the console for developers and shows people a friendly, translated toast. */
export function notifyError(error: unknown, fallback: string): void {
  console.error(error);
  toast.error(translate(userMessage(error, fallback), useLocale.getState().locale));
}
