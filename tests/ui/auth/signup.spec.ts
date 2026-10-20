import { ALERT } from '@constants/messages';
import { TAG } from '@constants/tags';
import { expect, test } from '@fixtures';
import { uniqueUsername } from '@utils/random';

test.describe('Sign up', { tag: TAG.REGRESSION }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  test('LGN-001 Verify a new user can sign up with a unique username', async ({
    navBar,
    signUpModal,
    loginModal,
  }) => {
    const user = { username: uniqueUsername('qa_signup'), password: 'Test@1234' };

    await navBar.openSignUp();
    const message = await signUpModal.register(user.username, user.password);

    expect(message).toBe(ALERT.SIGN_UP_SUCCESS);
    await expect(signUpModal.root).toBeHidden();

    await test.step('new credentials can log in', async () => {
      await navBar.openLogin();
      await loginModal.logIn(user.username, user.password);
      await navBar.expectLoggedInAs(user.username);
    });
  });

  test('LGN-002 Verify sign up is rejected for an existing username', async ({
    navBar,
    signUpModal,
    testUser,
    api,
  }) => {
    await navBar.openSignUp();
    const message = await signUpModal.register(testUser.username, 'Other@123');

    expect(message).toBe(ALERT.USER_EXISTS);

    await test.step('existing account is unchanged', async () => {
      await expect(api.getToken(testUser.username, testUser.password)).resolves.toBeTruthy();
    });
  });

  test('LGN-015 Verify a password with special and Unicode characters works', async ({
    navBar,
    signUpModal,
    loginModal,
  }) => {
    const user = { username: uniqueUsername('qa_uni'), password: 'Pässwörd_#$%_密码' };

    await navBar.openSignUp();
    expect(await signUpModal.register(user.username, user.password)).toBe(ALERT.SIGN_UP_SUCCESS);
    await expect(signUpModal.root).toBeHidden();

    await navBar.openLogin();
    await loginModal.logIn(user.username, user.password);
    await navBar.expectLoggedInAs(user.username);
  });
});
