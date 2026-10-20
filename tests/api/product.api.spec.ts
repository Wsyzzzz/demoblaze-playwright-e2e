import { API_ERROR } from '@constants/messages';
import { TAG } from '@constants/tags';
import { expect, test } from '@fixtures';
import { DEFECT, expectKnownDefect, knownDefectDetails } from '@fixtures/known-defect';

test.describe('Product API', { tag: [TAG.REGRESSION, TAG.API] }, () => {
  test(
    'CRT-048 Verify POST /view returns 404 for an unknown product',
    knownDefectDetails(DEFECT.HTTP_200_ERRORS),
    async ({ api }) => {
      expectKnownDefect(DEFECT.HTTP_200_ERRORS);

      const response = await api.view(9999);

      expect(await response.json()).toEqual({ errorMessage: API_ERROR.NOT_FOUND });
      expect(response.status()).toBe(404);
    },
  );
});
