// Prints a Markdown summary of reports/json/results.json (used for the GitHub Actions job summary).
// Usage: node scripts/ci-summary.mjs "<title>"
import { existsSync, readFileSync } from 'node:fs';

const title = process.argv[2] ?? 'Test results';
const file = 'reports/json/results.json';

if (!existsSync(file)) {
  console.log(`### ${title}\n\nNo results file found – the run did not produce a report.`);
  process.exit(0);
}

const report = JSON.parse(readFileSync(file, 'utf8'));
const { expected = 0, unexpected = 0, flaky = 0, skipped = 0, duration = 0 } = report.stats ?? {};

const failures = [];
const knownDefects = [];
const walk = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const issue = (t.annotations ?? []).find((a) => a.type === 'issue');
      if (t.status === 'unexpected') failures.push(`- ❌ ${spec.title} (${t.projectName})`);
      else if (t.expectedStatus === 'failed' && issue)
        knownDefects.push(`- ${spec.title} — ${issue.description}`);
    }
  }
  for (const child of suite.suites ?? []) walk(child);
};
for (const suite of report.suites ?? []) walk(suite);

const lines = [
  `### ${title}`,
  '',
  '| Passed (incl. expected failures) | Failed | Flaky | Skipped | Duration |',
  '|---|---|---|---|---|',
  `| ${expected} | ${unexpected} | ${flaky} | ${skipped} | ${(duration / 1000).toFixed(1)} s |`,
  '',
];
if (failures.length) lines.push('**Failures**', ...[...new Set(failures)], '');
if (knownDefects.length)
  lines.push('**Known defects (expected to fail)**', ...[...new Set(knownDefects)], '');
console.log(lines.join('\n'));
