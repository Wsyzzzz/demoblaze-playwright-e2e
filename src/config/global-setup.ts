import { env } from './env';
import { pruneRunReports } from './reports';

/** Runs once before the tests. */
export default function globalSetup(): void {
  if (process.env.CI) return;
  // This run's report is written when the run ends, so keep one fewer of the old ones.
  pruneRunReports(env.reportHistory - 1);
}
