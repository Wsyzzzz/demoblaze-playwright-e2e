import { TAG } from '@constants/tags';
import { expect, test } from '@fixtures';

test.describe('Session and logout', { tag: TAG.REGRESSION }, () => {
  test(
    'LGN-023 Verify the session persists after a page refresh',
    { tag: TAG.SMOKE },
    async ({ session, homePage, navBar }) => {
      await homePage.open();
      await navBar.expectLoggedInAs(session.user.username);

      await homePage.reload();

      await navBar.expectLoggedInAs(session.user.username);
    },
  );

  test(
    'LGN-030 Verify a user can log out',
    { tag: TAG.SMOKE },
    async ({ session, homePage, navBar, context }) => {
      await homePage.open();
      await navBar.expectLoggedInAs(session.user.username);

      await navBar.logOut();

      await navBar.expectLoggedOut();
      const authCookie = (await context.cookies()).find((c) => c.name === 'tokenp_');
      expect(authCookie?.value ?? '', 'auth cookie should be removed').toBe('');
    },
  );

  test('LGN-031 Verify browser Back after logout does not restore the session', async ({
    session,
    homePage,
    navBar,
    page,
  }) => {
    await homePage.open();
    await navBar.expectLoggedInAs(session.user.username);
    await navBar.logOut();

    await page.goBack();
    await page.reload();

    await navBar.expectLoggedOut();
  });
});
