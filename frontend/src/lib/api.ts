import { strings } from '@/strings';
import { isString } from '@/lib/typeGuards';

export async function request(url: string, init?: RequestInit, acceptedStatus?: number): Promise<Response> {
  const method = init?.method ?? strings.persistence.getMethod;
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(`${strings.persistence.networkFailed} (${method} ${url})${error instanceof Error ? `: ${error.message}` : strings.common.empty}`, { cause: error });
  }
  if (response.ok || response.status === acceptedStatus) return response;
  let detail = response.statusText || strings.persistence.unexpectedResponse;
  try {
    const problem: unknown = await response.json();
    if (problem && typeof problem === strings.common.object) {
      const fields = problem as { detail?: unknown; title?: unknown };
      if (isString(fields.detail) && fields.detail.trim()) detail = fields.detail;
      else if (isString(fields.title) && fields.title.trim()) detail = fields.title;
    }
  } catch {
    // A proxy or unavailable server may return a non-JSON error body.
  }
  throw new Error(`${strings.persistence.requestFailed} (${method} ${url}, ${strings.persistence.http} ${response.status}): ${detail}`);
}
