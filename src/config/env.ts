import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

/**
 * Known environments. Add staging/UAT entries here; every value can still be
 * overridden by an environment variable (see .env.example).
 */
const ENVIRONMENTS = {
  prod: {
    baseUrl: 'https://www.demoblaze.com',
    apiUrl: 'https://api.demoblaze.com',
  },
} as const;

type EnvironmentName = keyof typeof ENVIRONMENTS;
export type UserStrategy = 'per-worker' | 'env';

function readEnvironmentName(): EnvironmentName {
  const name = process.env.TEST_ENV ?? 'prod';
  if (!(name in ENVIRONMENTS)) {
    throw new Error(`Unknown TEST_ENV "${name}". Valid values: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }
  return name as EnvironmentName;
}

function readUserStrategy(): UserStrategy {
  const value = process.env.USER_STRATEGY ?? 'per-worker';
  if (value !== 'per-worker' && value !== 'env') {
    throw new Error(`Invalid USER_STRATEGY "${value}". Use "per-worker" or "env".`);
  }
  return value;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number, got "${raw}"`);
  }
  return value;
}

const environmentName = readEnvironmentName();
const defaults = ENVIRONMENTS[environmentName];

export const env = {
  name: environmentName,
  baseUrl: process.env.BASE_URL ?? defaults.baseUrl,
  apiUrl: process.env.API_URL ?? defaults.apiUrl,
  timezone: process.env.TIMEZONE ?? 'Asia/Kuala_Lumpur',
  /**
   * per-worker: each worker registers its own throwaway account (parallel-safe, no secrets needed).
   * env: use VALID_USER / VALID_PASSWORD (runs with a single worker).
   */
  userStrategy: readUserStrategy(),
  validUser: process.env.VALID_USER ?? '',
  validPassword: process.env.VALID_PASSWORD ?? '',
  /** Local runs keep this many HTML reports (one per run) in reports/html/. */
  reportHistory: readNumber('REPORT_HISTORY', 10),
  /** Check that the site and API respond before starting the run (SKIP_HEALTH_CHECK=1 turns it off). */
  healthCheck: process.env.SKIP_HEALTH_CHECK !== '1',
  perf: {
    cartPageBudgetMs: readNumber('CART_PAGE_BUDGET_MS', 3000),
  },
} as const;
