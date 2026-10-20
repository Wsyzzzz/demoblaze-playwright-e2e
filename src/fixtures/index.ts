import { test as base, expect } from '@playwright/test';
import { DemoblazeApi } from '../api/DemoblazeApi';
import { env } from '../config/env';
import { CartPage } from '../pages/CartPage';
import { HomePage } from '../pages/HomePage';
import { ProductPage } from '../pages/ProductPage';
import { LoginModal } from '../pages/components/LoginModal';
import { NavBar } from '../pages/components/NavBar';
import { OrderConfirmation } from '../pages/components/OrderConfirmation';
import { PlaceOrderModal } from '../pages/components/PlaceOrderModal';
import { SignUpModal } from '../pages/components/SignUpModal';
import { randomPassword, uniqueUsername } from '../utils/random';

export interface TestUser {
  username: string;
  password: string;
}

/** A logged-in browser session with an empty cart. */
export interface Session {
  user: TestUser;
  token: string;
}

interface PageObjects {
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  navBar: NavBar;
  loginModal: LoginModal;
  signUpModal: SignUpModal;
  placeOrderModal: PlaceOrderModal;
  orderConfirmation: OrderConfirmation;
}

interface TestFixtures extends PageObjects {
  /** API client for the current test. */
  api: DemoblazeApi;
  /** Logs `testUser` in through the API, empties their cart and injects the auth cookie. */
  session: Session;
}

interface WorkerFixtures {
  workerApi: DemoblazeApi;
  /** Account owned by this worker for the whole run (see USER_STRATEGY). */
  testUser: TestUser;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerApi: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext({ baseURL: env.apiUrl });
      await use(new DemoblazeApi(context));
      await context.dispose();
    },
    { scope: 'worker' },
  ],

  testUser: [
    async ({ workerApi }, use, workerInfo) => {
      if (env.userStrategy === 'env') {
        if (!env.validUser || !env.validPassword) {
          throw new Error('USER_STRATEGY=env needs VALID_USER and VALID_PASSWORD (see .env.example)');
        }
        await use({ username: env.validUser, password: env.validPassword });
        return;
      }
      // One throwaway account per worker keeps carts isolated when tests run in parallel.
      const user = {
        username: uniqueUsername(`qa_w${workerInfo.workerIndex}`),
        password: randomPassword(),
      };
      await workerApi.createUser(user.username, user.password);
      await use(user);
    },
    { scope: 'worker' },
  ],

  api: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({ baseURL: env.apiUrl });
    await use(new DemoblazeApi(context));
    await context.dispose();
  },

  session: async ({ context, api, testUser }, use) => {
    const token = await api.getToken(testUser.username, testUser.password);
    await api.clearCart(token);
    await context.addCookies([{ name: 'tokenp_', value: token, url: env.baseUrl }]);
    await use({ user: testUser, token });
  },

  homePage: async ({ page }, use) => use(new HomePage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  navBar: async ({ page }, use) => use(new NavBar(page)),
  loginModal: async ({ page }, use) => use(new LoginModal(page)),
  signUpModal: async ({ page }, use) => use(new SignUpModal(page)),
  placeOrderModal: async ({ page }, use) => use(new PlaceOrderModal(page)),
  orderConfirmation: async ({ page }, use) => use(new OrderConfirmation(page)),
});

export { expect };
