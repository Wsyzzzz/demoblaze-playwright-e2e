import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { env } from './src/config/env';
import { HTML_REPORTS_ROOT, reportStamp } from './src/config/reports';

const isCI = !!process.env.CI;

/** Browser-driven suites. API tests run once in their own project, not once per browser. */
const BROWSER_SUITES = /tests[\\/](ui|security)[\\/].*\.spec\.ts$/;

/**
 * Performance budgets only mean something on a quiet machine and network. Measured in the
 * middle of a full run, next to ~160 browser tests, they measure the test run itself. So the
 * perf project runs only when it is asked for (npm run test:perf, --project=perf or a perf path).
 * The flag goes into the environment so the worker processes build the same project list.
 */
if (process.argv.slice(2).some((arg) => /\bperf\b/.test(arg))) process.env.RUN_PERF = '1';
const runPerf = process.env.RUN_PERF === '1';

/**
 * Local runs keep a report per run (reports/html/test_report_<yyyyMMdd_HHmmss>/, newest
 * REPORT_HISTORY kept). The stamp goes into the environment so every process of a run agrees on it.
 */
process.env.REPORT_STAMP ??= reportStamp(new Date());
const htmlReportFolder = isCI
  ? HTML_REPORTS_ROOT
  : `${HTML_REPORTS_ROOT}/test_report_${process.env.REPORT_STAMP}`;

const reporters: ReporterDescription[] = [['list']];
// `--list` only prints the tests, so it should not create (or overwrite) any report.
if (!process.argv.includes('--list')) {
  reporters.push(
    ['html', { outputFolder: htmlReportFolder, open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    ['json', { outputFile: 'reports/json/results.json' }],
  );
}
if (isCI) reporters.push(['github']);

export default defineConfig({
  testDir: './tests',
  globalSetup: './src/config/global-setup.ts',
  outputDir: 'reports/test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // A shared account (USER_STRATEGY=env) cannot be used safely in parallel: carts would collide.
  workers: env.userStrategy === 'env' ? 1 : isCI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: reporters,

  use: {
    baseURL: env.baseUrl,
    timezoneId: env.timezone,
    locale: 'en-US',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      testMatch: BROWSER_SUITES,
      grepInvert: /@mobile/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: BROWSER_SUITES,
      grepInvert: /@mobile|@chromium-only/,
      // A Firefox start-up race is handled at its source by the `browser` fixture (src/fixtures).
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: BROWSER_SUITES,
      grepInvert: /@mobile|@chromium-only/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      // Cross-platform check: smoke flows plus mobile-only cases on an emulated phone.
      name: 'mobile-chrome',
      testMatch: BROWSER_SUITES,
      grep: /@smoke|@mobile/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'api',
      testMatch: /tests[\\/]api[\\/].*\.spec\.ts$/,
    },
    ...(runPerf
      ? [
          {
            name: 'perf',
            testMatch: /tests[\\/]perf[\\/].*\.spec\.ts$/,
            retries: 0,
            use: { ...devices['Desktop Chrome'] },
          },
        ]
      : []),
  ],
});
