import { ALERT } from '@constants/messages';
import { TAG } from '@constants/tags';
import { expect, test } from '@fixtures';
import { uniqueUsername } from '@utils/random';
import loginValidationCases from '@data/login-validation.json';

test.describe('Login', { tag: TAG.REGRESSION }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  test(
    'LGN-004 Verify a user can log in with valid credentials',
    { tag: TAG.SMOKE },
    async ({ navBar, loginModal, testUser }) => {
      await navBar.openLogin();
      await loginModal.logIn(testUser.username, testUser.password);

      await expect(loginModal.root).toBeHidden();
      await navBar.expectLoggedInAs(testUser.username);
    },
  );

  test('LGN-006 Verify login is rejected with a wrong password', async ({ navBar, loginModal, testUser }) => {
    await navBar.openLogin();
    const message = await loginModal.submitExpectingAlert(testUser.username, 'WrongPass!');

    expect(message).toBe(ALERT.WRONG_PASSWORD);
    await expect(loginModal.root).toBeVisible();
    await expect(navBar.welcomeText).toBeHidden();
  });

  test('LGN-007 Verify login is rejected for an unregistered username', async ({ navBar, loginModal }) => {
    await navBar.openLogin();
    const message = await loginModal.submitExpectingAlert(uniqueUsername('no_such_user'), 'Test@1234');

    expect(message).toBe(ALERT.USER_NOT_FOUND);
    await expect(navBar.welcomeText).toBeHidden();
  });

  // Data-driven: required-field validation (src/data/login-validation.json)
  for (const data of loginValidationCases) {
    test(`${data.id} ${data.title}`, async ({ navBar, loginModal, page, testUser }) => {
      const username = data.username.replace('{TEST_USER}', testUser.username);
      const loginRequests: string[] = [];
      page.on('request', (request) => {
        if (request.url().endsWith('/login')) loginRequests.push(request.url());
      });

      await navBar.openLogin();
      const message = await loginModal.submitExpectingAlert(username, data.password);

      expect(message).toBe(ALERT.LOGIN_FIELDS_REQUIRED);
      expect(loginRequests, 'no login request should be sent').toHaveLength(0);
      await expect(navBar.welcomeText).toBeHidden();
    });
  }
});

test.describe('Login on mobile', { tag: [TAG.REGRESSION, TAG.MOBILE] }, () => {
  test('LGN-022 Verify login works at mobile width through the collapsed menu', async ({
    homePage,
    navBar,
    loginModal,
    testUser,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Runs only in the mobile-chrome project');

    await homePage.open();
    // Mobile layout: the hamburger toggle is shown. (DemoBlaze's menu itself never collapses,
    // so NavBar.expandIfCollapsed() only clicks the toggle when the menu is actually hidden.)
    await expect(navBar.menuToggle).toBeVisible();

    await navBar.openLogin();
    await loginModal.logIn(testUser.username, testUser.password);

    await navBar.expandIfCollapsed();
    await expect(navBar.welcomeText).toBeVisible();
    await expect(navBar.welcomeText).toHaveText(`Welcome ${testUser.username}`);
    await expect(navBar.logOutLink).toBeVisible();
  });
});
