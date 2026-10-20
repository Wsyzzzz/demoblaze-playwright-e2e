import { API_ERROR } from '@constants/messages';
import { TAG } from '@constants/tags';
import { expect, test } from '@fixtures';
import { DEFECT, expectKnownDefect, knownDefectDetails } from '@fixtures/known-defect';

test.describe('Auth API', { tag: [TAG.REGRESSION, TAG.API] }, () => {
  test(
    'LGN-032 Verify POST /login returns a token for valid credentials',
    { tag: TAG.SMOKE },
    async ({ api, testUser }) => {
      const response = await api.login(testUser.username, testUser.password);

      expect(response.status()).toBe(200);
      const body: unknown = await response.json();
      expect(typeof body).toBe('string');
      expect(body as string).toMatch(/^Auth_token: \S+$/);
    },
  );

  test('LGN-033 Verify POST /login rejects a wrong password', async ({ api, testUser }) => {
    const response = await api.login(testUser.username, 'WrongPass!');

    const body: unknown = await response.json();
    expect(body).toEqual({ errorMessage: API_ERROR.WRONG_PASSWORD });
    expect(JSON.stringify(body)).not.toContain('Auth_token');
  });

  test(
    'LGN-034 Verify POST /check returns 401 for an invalid token',
    knownDefectDetails(DEFECT.HTTP_200_ERRORS),
    async ({ api }) => {
      expectKnownDefect(DEFECT.HTTP_200_ERRORS);

      const response = await api.check('garbage');

      expect(await response.json()).toEqual({ errorMessage: API_ERROR.TOKEN_MALFORMED });
      expect(response.status()).toBe(401);
    },
  );
});
