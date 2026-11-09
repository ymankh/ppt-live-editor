import { strings } from '@/strings';
import { isString } from '@/lib/typeGuards';

/**
 * A failed Folio API call. The message is technical (method, URL, status, server text) and meant for
 * the console; show people `userMessage(error, …)` from `@/features/errors/userMessage` instead.
 */
export class ApiError extends Error {
  /** HTTP status, or undefined when the server could not be reached at all. */
  readonly status: number | undefined;
  /** The ProblemDetails `detail` or `title` the server sent, if any. */
  readonly serverMessage: string | undefined;

  constructor(message: string, status: number | undefined, serverMessage: string | undefined, options?: ErrorOptions) {
    super(message, options);
    this.name = strings.persistence.apiErrorName;
    this.status = status;
    this.serverMessage = serverMessage;
  }
}

export async function request(url: string, init?: RequestInit, acceptedStatus?: number): Promise<Response> {
  const method = init?.method ?? strings.persistence.getMethod;
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new ApiError(
      `${strings.persistence.networkFailed} (${method} ${url})${error instanceof Error ? `: ${error.message}` : strings.common.empty}`,
      undefined, undefined, { cause: error },
    );
  }
  if (response.ok || response.status === acceptedStatus) return response;
  let serverMessage: string | undefined;
  try {
    const problem: unknown = await response.json();
    if (problem && typeof problem === strings.common.object) {
      const fields = problem as { detail?: unknown; title?: unknown };
      if (isString(fields.detail) && fields.detail.trim()) serverMessage = fields.detail;
      else if (isString(fields.title) && fields.title.trim()) serverMessage = fields.title;
    }
  } catch {
    // A proxy or unavailable server may return a non-JSON error body.
  }
  const detail = serverMessage ?? (response.statusText || strings.persistence.unexpectedResponse);
  throw new ApiError(
    `${strings.persistence.requestFailed} (${method} ${url}, ${strings.persistence.http} ${response.status}): ${detail}`,
    response.status, serverMessage,
  );
}
