import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { env } from './src/config/env';

const isCI = !!process.env.CI;

/** Browser-driven suites. API tests run once in their own project, not once per browser. */
const BROWSER_SUITES = /tests[\\/](ui|security)[\\/].*\.spec\.ts$/;

const reporters: ReporterDescription[] = [
  ['list'],
  ['html', { outputFolder: 'reports/html', open: 'never' }],
  ['junit', { outputFile: 'reports/junit/results.xml' }],
  ['json', { outputFile: 'reports/json/results.json' }],
];
if (isCI) reporters.push(['github']);

export default defineConfig({
  testDir: './tests',
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
      grepInvert: /@mobile/,
      // A Firefox start-up race is handled at its source by the `browser` fixture (src/fixtures).
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: BROWSER_SUITES,
      grepInvert: /@mobile/,
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
    {
      name: 'perf',
      testMatch: /tests[\\/]perf[\\/].*\.spec\.ts$/,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
