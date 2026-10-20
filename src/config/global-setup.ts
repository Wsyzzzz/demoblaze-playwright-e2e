import { env } from './env';
import { checkSiteIsHealthy } from './health-check';
import { pruneRunReports } from './reports';

/** Runs once before the tests. */
export default async function globalSetup(): Promise<void> {
  if (env.healthCheck) await checkSiteIsHealthy();
  if (!process.env.CI) {
    // This run's report is written when the run ends, so keep one fewer of the old ones.
    pruneRunReports(env.reportHistory - 1);
  }
}
