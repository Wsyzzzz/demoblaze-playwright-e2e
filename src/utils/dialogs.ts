import type { Dialog, Page } from '@playwright/test';

/**
 * Runs `trigger`, accepts the next native dialog (alert) and returns its message.
 *
 * The listener is registered *before* the trigger and accepts the dialog immediately,
 * because some DemoBlaze alerts fire synchronously inside the click handler and would
 * otherwise block the click from completing.
 */
export async function acceptNextDialog(
  page: Page,
  trigger: () => Promise<unknown>,
  timeoutMs = 10_000,
): Promise<string> {
  let onDialog: ((dialog: Dialog) => Promise<void>) | undefined;
  let timer: NodeJS.Timeout | undefined;

  const message = new Promise<string>((resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Expected a browser dialog within ${timeoutMs} ms, but none appeared`)),
      timeoutMs,
    );
    onDialog = async (dialog: Dialog) => {
      clearTimeout(timer);
      const text = dialog.message();
      await dialog.accept().catch(() => undefined);
      resolve(text);
    };
    page.once('dialog', onDialog);
  });

  try {
    await trigger();
    return await message;
  } finally {
    clearTimeout(timer);
    if (onDialog) page.off('dialog', onDialog);
  }
}
