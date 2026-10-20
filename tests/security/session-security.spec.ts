import { TAG } from '@constants/tags';
import { expect, test } from '@fixtures';
import { DEFECT, expectKnownDefect, knownDefectDetails } from '@fixtures/known-defect';
import { decodeBase64 } from '@utils/encoding';

test.describe('Session security', { tag: [TAG.REGRESSION, TAG.SECURITY] }, () => {
  test(
    'LGN-026 Verify the auth token cannot be predicted from the username',
    knownDefectDetails(DEFECT.PREDICTABLE_TOKEN),
    async ({ session }) => {
      expectKnownDefect(DEFECT.PREDICTABLE_TOKEN);

      const decoded = decodeBase64(session.token);

      expect(decoded, 'decoded token must not reveal the username').not.toContain(session.user.username);
    },
  );

  test(
    'LGN-027 Verify the auth cookie has the Secure and HttpOnly flags',
    knownDefectDetails(DEFECT.COOKIE_FLAGS),
    async ({ homePage, navBar, loginModal, testUser, context }) => {
      expectKnownDefect(DEFECT.COOKIE_FLAGS);

      // Log in through the UI so the cookie is created by the site itself, not by the test.
      await homePage.open();
      await navBar.openLogin();
      await loginModal.logIn(testUser.username, testUser.password);
      await navBar.expectLoggedInAs(testUser.username);

      const authCookie = (await context.cookies()).find((c) => c.name === 'tokenp_');
      expect(authCookie, 'auth cookie should exist').toBeDefined();
      expect.soft(authCookie?.secure, 'Secure flag').toBe(true);
      expect.soft(authCookie?.httpOnly, 'HttpOnly flag').toBe(true);
    },
  );
});
