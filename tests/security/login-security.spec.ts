import { env } from '@config/env';
import { ALERT } from '@constants/messages';
import { TAG } from '@constants/tags';
import { expect, test } from '@fixtures';
import { DEFECT, expectKnownDefect, knownDefectDetails } from '@fixtures/known-defect';
import { acceptNextDialog } from '@utils/dialogs';
import { encodePassword } from '@utils/encoding';

test.describe('Login security', { tag: [TAG.REGRESSION, TAG.SECURITY] }, () => {
  test('LGN-017 Verify SQL-injection input does not bypass login', async ({
    homePage,
    navBar,
    loginModal,
  }) => {
    const injection = "' OR '1'='1";

    await homePage.open();
    await navBar.openLogin();
    const message = await loginModal.submitExpectingAlert(injection, injection);

    // Rejected with one of the normal login errors – never logged in, never a server error.
    expect([ALERT.USER_NOT_FOUND, ALERT.WRONG_PASSWORD]).toContain(message);
    await expect(navBar.welcomeText).toBeHidden();
  });

  test(
    'LGN-018 Verify repeated failed logins trigger a lockout or rate limit',
    knownDefectDetails(DEFECT.NO_LOCKOUT),
    async ({ homePage, navBar, loginModal, testUser }) => {
      expectKnownDefect(DEFECT.NO_LOCKOUT);
      // Uses the worker's throwaway account, so a real lockout cannot affect anyone else.
      const attempts = 10;
      const messages: string[] = [];

      await homePage.open();
      await navBar.openLogin();
      for (let i = 0; i < attempts; i++) {
        messages.push(await loginModal.submitExpectingAlert(testUser.username, `WrongPass_${i}!`));
      }

      const lastMessage = messages.at(-1);
      expect(lastMessage, `after ${attempts} failed attempts the login should be blocked`).not.toBe(
        ALERT.WRONG_PASSWORD,
      );
    },
  );

  test('LGN-025 Verify a tampered auth cookie is rejected', async ({
    session,
    context,
    homePage,
    navBar,
    page,
  }) => {
    await context.addCookies([{ name: 'tokenp_', value: 'invalidtoken123', url: env.baseUrl }]);

    const message = await acceptNextDialog(page, () => homePage.open());

    expect(message, 'user is told the session is invalid').toMatch(/token/i);
    await expect(navBar.welcomeText).not.toHaveText(`Welcome ${session.user.username}`);
    await navBar.expectLoggedOut();
  });

  test('LGN-028 Verify login requests are sent over HTTPS', async ({
    homePage,
    navBar,
    loginModal,
    testUser,
    page,
  }) => {
    await homePage.open();
    await navBar.openLogin();
    const [loginRequest] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/login')),
      loginModal.logIn(testUser.username, testUser.password),
    ]);

    expect(loginRequest.url()).toBe(`${env.apiUrl}/login`);
    expect(new URL(loginRequest.url()).protocol).toBe('https:');
  });

  test(
    'LGN-029 Verify the password is not sent in a reversible encoding',
    knownDefectDetails(DEFECT.REVERSIBLE_PASSWORD),
    async ({ homePage, navBar, loginModal, testUser, page }) => {
      expectKnownDefect(DEFECT.REVERSIBLE_PASSWORD);

      await homePage.open();
      await navBar.openLogin();
      const [loginRequest] = await Promise.all([
        page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/login')),
        loginModal.logIn(testUser.username, testUser.password),
      ]);

      const { password } = loginRequest.postDataJSON() as { password: string };
      expect.soft(password, 'not in plain text').not.toBe(testUser.password);
      expect(password, 'not simply Base64-encoded').not.toBe(encodePassword(testUser.password));
    },
  );
});
