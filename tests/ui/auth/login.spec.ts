import { ALERT } from '@constants/messages';
import { TAG } from '@constants/tags';
import { PRODUCTS } from '@data/products';
import { expect, test } from '@fixtures';
import { DEFECT, expectKnownDefect, knownDefectDetails } from '@fixtures/known-defect';
import { uniqueUsername } from '@utils/random';
import loginValidationCases from '@data/login-validation.json';
import type { Page } from '@playwright/test';

/** Collects the URLs of POST /login requests the page sends. */
function trackLoginRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/login')) requests.push(request.url());
  });
  return requests;
}

/**
 * Clicks submit and reports what happened: a successful login reloads the page,
 * a rejected one shows an alert. Used where the outcome itself is under test.
 */
async function loginOutcome(page: Page, submit: () => Promise<void>): Promise<string> {
  const alert = page.waitForEvent('dialog').then(async (dialog) => {
    const message = dialog.message();
    await dialog.accept();
    return `alert: ${message}`;
  });
  const reload = page.waitForEvent('load').then(() => 'logged-in');
  await submit();
  return Promise.race([alert, reload]);
}

const invertCase = (value: string): string =>
  [...value].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join('');

test.describe('Login', { tag: TAG.REGRESSION }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  test('LGN-003 Verify the Login modal opens with the expected fields', async ({ navBar, loginModal }) => {
    await navBar.openLogin();

    await expect(loginModal.root).toBeVisible();
    await expect(loginModal.root.locator('.modal-title')).toHaveText('Log in');
    await expect(loginModal.usernameInput).toBeVisible();
    await expect(loginModal.passwordInput).toBeVisible();
    await expect(loginModal.passwordInput).toHaveAttribute('type', 'password');
    await expect(loginModal.closeButton).toBeVisible();
    await expect(loginModal.submitButton).toBeVisible();
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
      const loginRequests = trackLoginRequests(page);

      await navBar.openLogin();
      const message = await loginModal.submitExpectingAlert(username, data.password);

      expect(message).toBe(ALERT.LOGIN_FIELDS_REQUIRED);
      expect(loginRequests, 'no login request should be sent').toHaveLength(0);
      await expect(navBar.welcomeText).toBeHidden();
    });
  }

  test(
    'LGN-011 Verify whitespace-only username and password are treated as empty',
    knownDefectDetails(DEFECT.WHITESPACE_INPUT),
    async ({ navBar, loginModal, page }) => {
      expectKnownDefect(DEFECT.WHITESPACE_INPUT);
      const loginRequests = trackLoginRequests(page);

      await navBar.openLogin();
      const message = await loginModal.submitExpectingAlert('   ', '   ');

      expect(message).toBe(ALERT.LOGIN_FIELDS_REQUIRED);
      expect(loginRequests, 'no login request should be sent').toHaveLength(0);
    },
  );

  test(
    'LGN-012 Verify leading and trailing spaces in the username are trimmed',
    knownDefectDetails(DEFECT.USERNAME_NOT_TRIMMED),
    async ({ navBar, loginModal, page, testUser }) => {
      expectKnownDefect(DEFECT.USERNAME_NOT_TRIMMED);
      await navBar.openLogin();
      await loginModal.fill(` ${testUser.username} `, testUser.password);
      const outcome = await loginOutcome(page, () => loginModal.submitButton.click());

      expect(outcome, 'login with surrounding spaces should succeed').toBe('logged-in');
      await navBar.expectLoggedInAs(testUser.username);
    },
  );

  test(
    'LGN-013 Verify username matching is not case-sensitive',
    knownDefectDetails(DEFECT.USERNAME_CASE_SENSITIVE),
    async ({ navBar, loginModal, page, testUser }) => {
      expectKnownDefect(DEFECT.USERNAME_CASE_SENSITIVE);
      await navBar.openLogin();
      await loginModal.fill(testUser.username.toUpperCase(), testUser.password);
      const outcome = await loginOutcome(page, () => loginModal.submitButton.click());

      expect(outcome, 'login with the username in upper case should succeed').toBe('logged-in');
      await navBar.expectLoggedInAs(testUser.username);
    },
  );

  test('LGN-014 Verify password matching is case-sensitive', async ({ navBar, loginModal, testUser }) => {
    await navBar.openLogin();
    const message = await loginModal.submitExpectingAlert(testUser.username, invertCase(testUser.password));

    expect(message).toBe(ALERT.WRONG_PASSWORD);
    await expect(navBar.welcomeText).toBeHidden();
  });

  test('LGN-016 Verify a 300-character username is handled without errors', async ({
    navBar,
    loginModal,
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await navBar.openLogin();
    // Unique on every run: this is a shared public site and someone has already registered 'a' x 300.
    const longUsername = uniqueUsername('qa_long').padEnd(300, 'a');
    const message = await loginModal.submitExpectingAlert(longUsername, 'Test@1234');

    expect(message).toBe(ALERT.USER_NOT_FOUND);
    expect(pageErrors, 'no JavaScript errors').toEqual([]);
    await expect(loginModal.submitButton).toBeEnabled();
  });

  test(
    "LGN-019 Verify double-clicking 'Log in' logs the user in once",
    knownDefectDetails(DEFECT.DOUBLE_SUBMIT_LOGIN),
    async ({ navBar, loginModal, page, testUser }) => {
      expectKnownDefect(DEFECT.DOUBLE_SUBMIT_LOGIN);
      const loginRequests = trackLoginRequests(page);

      await navBar.openLogin();
      await loginModal.fill(testUser.username, testUser.password);
      await Promise.all([page.waitForEvent('load'), loginModal.submitButton.dblclick()]);

      await navBar.expectLoggedInAs(testUser.username);
      expect(loginRequests, 'exactly one login request').toHaveLength(1);
    },
  );

  test(
    'LGN-020 Verify pressing Enter in the Password field submits the login',
    knownDefectDetails(DEFECT.ENTER_DOES_NOT_SUBMIT),
    async ({ navBar, loginModal, testUser }) => {
      expectKnownDefect(DEFECT.ENTER_DOES_NOT_SUBMIT);

      await navBar.openLogin();
      await loginModal.fill(testUser.username, testUser.password);
      await loginModal.passwordInput.press('Enter');

      await expect(navBar.welcomeText).toHaveText(`Welcome ${testUser.username}`, { timeout: 5_000 });
    },
  );

  test(
    'LGN-021 Verify the Login modal clears its fields after Close',
    knownDefectDetails(DEFECT.MODAL_KEEPS_VALUES),
    async ({ navBar, loginModal }) => {
      expectKnownDefect(DEFECT.MODAL_KEEPS_VALUES);

      await navBar.openLogin();
      await loginModal.fill('anyuser', 'anypassword');
      await loginModal.close();
      await expect(navBar.welcomeText).toBeHidden();
      await navBar.openLogin();

      await expect(loginModal.usernameInput).toHaveValue('');
      await expect(loginModal.passwordInput).toHaveValue('');
    },
  );
});

test.describe('Login from other pages', { tag: TAG.REGRESSION }, () => {
  test('LGN-005 Verify logging in from the Cart page keeps the user on the Cart page', async ({
    api,
    testUser,
    cartPage,
    navBar,
    loginModal,
    page,
  }) => {
    // Arrange: the user's server-side cart holds one item; the browser is logged out.
    const token = await api.getToken(testUser.username, testUser.password);
    await api.clearCart(token);
    await api.addProducts(token, [PRODUCTS.samsungGalaxyS6.id]);

    await cartPage.open();
    await navBar.openLogin();
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/viewcart') && r.ok()),
      loginModal.logIn(testUser.username, testUser.password),
    ]);

    await expect(page).toHaveURL(/\/cart\.html/);
    await navBar.expectLoggedInAs(testUser.username);
    await cartPage.expectContents([PRODUCTS.samsungGalaxyS6]);
  });
});

test.describe('Login on mobile', { tag: [TAG.REGRESSION, TAG.MOBILE] }, () => {
  test('LGN-022 Verify login works at mobile width', async ({
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
