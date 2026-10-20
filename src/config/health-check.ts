import { env } from './env';

/**
 * DemoBlaze is a shared public demo, and its API sometimes slows to a crawl or disappears
 * (seen on 20-Oct-2026: replies went from ~0.3 s to 8-12 s, then the API host stopped resolving).
 * Running 170+ tests against it then produces dozens of failures that say nothing about the
 * code. So before the run, check that the site and the API answer, and promptly.
 */
const ATTEMPTS = 3;
const TIMEOUT_MS = 10_000;
/** The API normally answers in well under a second. */
const SLOW_MS = 5_000;

interface Target {
  name: string;
  url: string;
}

async function probe(target: Target): Promise<string | null> {
  let problem = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      const response = await fetch(target.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      const ms = Date.now() - started;
      if (!response.ok) problem = `answered HTTP ${response.status}`;
      else if (ms > SLOW_MS) problem = `took ${ms} ms to answer (normally well under 1 s)`;
      else return null;
    } catch (error) {
      const { message, cause } = error as Error & { cause?: { code?: string } };
      problem = `is unreachable (${cause?.code ?? message})`;
    }
  }
  return `${target.name} ${target.url} ${problem} in ${ATTEMPTS} attempts`;
}

export async function checkSiteIsHealthy(): Promise<void> {
  const targets: Target[] = [
    { name: 'Website', url: env.baseUrl },
    { name: 'API', url: `${env.apiUrl}/entries` },
  ];
  const problems = (await Promise.all(targets.map(probe))).filter((p): p is string => p !== null);
  if (problems.length === 0) return;
  throw new Error(
    [
      'DemoBlaze is not healthy, so the tests were not started (they would fail for reasons unrelated to the tests):',
      ...problems.map((p) => `  - ${p}`),
      'Try again in a few minutes. To run anyway, set SKIP_HEALTH_CHECK=1.',
    ].join('\n'),
  );
}
