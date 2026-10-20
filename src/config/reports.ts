import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

/**
 * Local runs keep one HTML report per run, in reports/html/test_report_<yyyyMMdd_HHmmss>/.
 * The date is written year first so the folders sort by date in any file explorer.
 * CI does not need this: every build already keeps its own report.
 */
export const HTML_REPORTS_ROOT = 'reports/html';
const RUN_REPORT = /^test_report_\d{8}_\d{6}$/;

/** 20 Oct 2026 13:41:00 -> "20261020_134100" (local time). */
export function reportStamp(date: Date): string {
  const two = (n: number): string => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}_` +
    `${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`
  );
}

/** Report folders of earlier runs, oldest first. */
export function runReports(root = HTML_REPORTS_ROOT): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && RUN_REPORT.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/** Deletes the oldest run reports so that at most `keep` remain. */
export function pruneRunReports(keep: number, root = HTML_REPORTS_ROOT): void {
  const reports = runReports(root);
  for (const name of reports.slice(0, Math.max(0, reports.length - keep))) {
    rmSync(path.join(root, name), { recursive: true, force: true });
  }
  // Leftovers of the old single-report layout (reports/html/index.html).
  for (const name of ['index.html', 'data', 'trace']) {
    rmSync(path.join(root, name), { recursive: true, force: true });
  }
}
