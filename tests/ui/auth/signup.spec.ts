import { ALERT } from '@constants/messages';
import { TAG } from '@constants/tags';
import { expect, test } from '@fixtures';
import { uniqueUsername } from '@utils/random';

test.describe('Sign up', { tag: TAG.REGRESSION }, () => {
  test('LGN-001 Verify a new user can sign up with a unique username', async ({
    homePage,
    navBar,
    signUpModal,
    loginModal,
  }) => {
    const user = { username: uniqueUsername('qa_signup'), password: 'Test@1234' };

    await homePage.open();
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
});
