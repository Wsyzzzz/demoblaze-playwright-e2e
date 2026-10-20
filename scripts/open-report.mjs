// Opens an HTML report: the newest run by default, or a given one.
// Usage: npm run report                    (newest)
//        npm run report -- 20261020_134100 (that run)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = 'reports/html';
const runs = existsSync(root)
  ? readdirSync(root)
      .filter((name) => /^test_report_\d{8}_\d{6}$/.test(name))
      .sort()
  : [];
const wanted = process.argv[2];
// CI artifacts have a single report directly in reports/html.
const folder = wanted
  ? path.join(root, `test_report_${wanted}`)
  : runs.length
    ? path.join(root, runs.at(-1))
    : root;

if (!existsSync(path.join(folder, 'index.html'))) {
  console.log(`No report in ${folder}. Reports kept: ${runs.join(', ') || 'none (run the tests first)'}`);
  process.exit(1);
}
console.log(`Opening ${folder}`);
const result = spawnSync('npx', ['playwright', 'show-report', folder], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 0);
