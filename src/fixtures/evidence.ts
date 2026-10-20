import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import type { DemoblazeApi } from '../api/DemoblazeApi';

/**
 * Known-defect tests are expected to fail, so Playwright treats them as passed and
 * discards their failure screenshots and videos. These helpers keep that evidence:
 * attached to the HTML report and copied to reports/evidence/ as
 * <defect>_<test case>_<project>.<png|webm|txt>, ready to attach to a bug ticket.
 */

export function isKnownDefect(testInfo: TestInfo): boolean {
  return testInfo.expectedStatus === 'failed';
}

function defectId(testInfo: TestInfo): string {
  const issue = testInfo.annotations.find((a) => a.type === 'issue')?.description ?? '';
  return issue.match(/^PD-\d+/)?.[0] ?? 'known-defect';
}

function evidenceFile(testInfo: TestInfo, extension: string): string {
  const testCaseId = testInfo.title.split(' ')[0];
  const reportsDir = path.dirname(testInfo.project.outputDir);
  return path.join(
    reportsDir,
    'evidence',
    `${defectId(testInfo)}_${testCaseId}_${testInfo.project.name}.${extension}`,
  );
}

/** Screenshot of the final state plus the full video of the test. Call after the test body. */
export async function saveKnownDefectEvidence(page: Page, testInfo: TestInfo): Promise<void> {
  if (page.isClosed()) return;
  const id = defectId(testInfo);
  await mkdir(path.dirname(evidenceFile(testInfo, 'png')), { recursive: true });

  const screenshot = await page.screenshot({ fullPage: true }).catch(() => undefined);
  if (screenshot) {
    await testInfo.attach(`evidence ${id} – screenshot`, { body: screenshot, contentType: 'image/png' });
    await writeFile(evidenceFile(testInfo, 'png'), screenshot);
  }

  const video = page.video();
  if (video) {
    // The video file is only complete once the page is closed.
    await page.close();
    const videoPath = testInfo.outputPath(`evidence-${id}.webm`);
    await video.saveAs(videoPath);
    await testInfo.attach(`evidence ${id} – video`, { path: videoPath, contentType: 'video/webm' });
    await copyFile(videoPath, evidenceFile(testInfo, 'webm'));
  }
}

/** Attaches the API request/response history (secrets masked) to the report. */
export async function attachApiLog(api: DemoblazeApi, testInfo: TestInfo): Promise<void> {
  if (api.log.entries.length === 0) return;
  const text = api.log.toText();
  await testInfo.attach('api-log.txt', { body: text, contentType: 'text/plain' });
  if (isKnownDefect(testInfo)) {
    await mkdir(path.dirname(evidenceFile(testInfo, 'txt')), { recursive: true });
    await writeFile(evidenceFile(testInfo, 'txt'), text);
  }
}
