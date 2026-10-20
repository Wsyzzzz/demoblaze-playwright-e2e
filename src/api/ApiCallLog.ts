import type { APIResponse } from '@playwright/test';

export interface ApiCallRecord {
  time: string;
  method: string;
  url: string;
  requestBody?: unknown;
  status: number;
  durationMs: number;
  responseBody: string;
}

const SECRET_FIELDS = new Set(['password', 'token', 'cookie']);
const MAX_BODY_CHARS = 2_000;

/** Keeps the first 4 characters so log lines stay recognisable, hides the rest. */
export function maskSecret(value: string): string {
  return value.length <= 4 ? '***' : `${value.slice(0, 4)}***`;
}

function maskBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([key, value]) => [
      key,
      SECRET_FIELDS.has(key) && typeof value === 'string' ? maskSecret(value) : value,
    ]),
  );
}

function maskResponse(text: string): string {
  const masked = text
    .replace(/(Auth_token: )([^"\s]+)/g, (_m, prefix: string, token: string) => prefix + maskSecret(token))
    .replace(
      /("(?:token|cookie)"\s*:\s*")([^"]+)/g,
      (_m, prefix: string, value: string) => prefix + maskSecret(value),
    );
  return masked.length > MAX_BODY_CHARS ? `${masked.slice(0, MAX_BODY_CHARS)}… (truncated)` : masked;
}

/**
 * Request/response history of one API client, attached to the test report as evidence.
 * Passwords, tokens and cart cookies are masked before they are stored.
 */
export class ApiCallLog {
  private readonly records: ApiCallRecord[] = [];

  async record(
    method: string,
    url: string,
    requestBody: unknown,
    startedAt: number,
    response: APIResponse,
  ): Promise<void> {
    const text = await response.text().catch(() => '<unreadable body>');
    this.records.push({
      time: new Date(startedAt).toISOString(),
      method,
      url,
      requestBody: maskBody(requestBody),
      status: response.status(),
      durationMs: Date.now() - startedAt,
      responseBody: maskResponse(text.trim()),
    });
  }

  get entries(): readonly ApiCallRecord[] {
    return this.records;
  }

  /** Human-readable version for the report. */
  toText(): string {
    return this.records
      .map((r, i) =>
        [
          `#${i + 1} ${r.time}  ${r.method} ${r.url}  ->  HTTP ${r.status} (${r.durationMs} ms)`,
          r.requestBody === undefined ? '' : `   request : ${JSON.stringify(r.requestBody)}`,
          `   response: ${r.responseBody}`,
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n');
  }
}
