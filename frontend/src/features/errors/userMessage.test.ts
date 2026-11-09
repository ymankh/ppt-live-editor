import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { arabic } from '@/features/localization/ar';
import { useLocale } from '@/features/localization/locale';
import { strings } from '@/strings';
import { notifyError, userMessage } from './userMessage';

const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError } }));

const fallback = strings.errors.saveChanges;
const apiError = (status: number | undefined, serverMessage?: string) => new ApiError(
  `Folio API request failed (PUT /api/projects/x, HTTP ${String(status)}): ${serverMessage ?? 'Not Found'}`,
  status,
  serverMessage,
);

afterEach(() => {
  vi.restoreAllMocks();
  toastError.mockClear();
  useLocale.getState().setLocale('en');
});

describe('friendly error messages', () => {
  it('explains an unreachable server without technical details', () => {
    expect(userMessage(apiError(undefined), fallback)).toBe(strings.errors.offline);
  });

  it('explains server problems and oversized uploads by status', () => {
    for (const status of [500, 502, 503, 504])
      expect(userMessage(apiError(status, 'Database is unavailable'), fallback)).toBe(strings.errors.serverProblem);
    expect(userMessage(apiError(413, 'Request exceeds the 100 MiB limit'), fallback)).toBe(strings.errors.tooLarge);
  });

  it('says what failed instead of repeating server wording for other statuses', () => {
    expect(userMessage(apiError(404, 'Not Found'), fallback)).toBe(fallback);
    expect(userMessage(apiError(400, 'Invalid presentation'), fallback)).toBe(fallback);
    expect(userMessage(apiError(409), fallback)).toBe(fallback);
  });

  it('keeps messages the app defines, including rules the server re-checks', () => {
    expect(userMessage(apiError(409, 'A font with this family name is already uploaded.'), fallback))
      .toBe('A font with this family name is already uploaded.');
    expect(userMessage(apiError(413, 'Font exceeds the 20 MiB limit.'), fallback)).toBe('Font exceeds the 20 MiB limit.');
    expect(userMessage(new Error(strings.store.presentationNotFound), fallback)).toBe(strings.store.presentationNotFound);
  });

  it('hides browser, library and unknown errors behind the fallback', () => {
    expect(userMessage(new SyntaxError('Unexpected token \'<\', "<!doctype "... is not valid JSON'), fallback)).toBe(fallback);
    expect(userMessage(new TypeError('Cannot read properties of undefined (reading \'id\')'), fallback)).toBe(fallback);
    expect(userMessage('boom', fallback)).toBe(fallback);
    expect(userMessage(undefined, fallback)).toBe(fallback);
  });

  it('has an Arabic translation for every message', () => {
    for (const message of [...Object.values(strings.errors), strings.store.presentationNotFound])
      expect(arabic, message).toHaveProperty([message]);
  });

  it('shows a translated toast and keeps the technical error in the console', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = apiError(503, 'Disk unavailable');
    useLocale.getState().setLocale('ar');
    notifyError(error, fallback);
    expect(toastError).toHaveBeenCalledWith(arabic[strings.errors.serverProblem]);
    expect(log).toHaveBeenCalledWith(error);
  });
});
