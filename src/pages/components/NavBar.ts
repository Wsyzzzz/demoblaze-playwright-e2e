import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Top navigation bar, shared by every page.
 * On narrow (mobile) viewports the links sit inside a collapsed menu, so every
 * action first makes sure the menu is expanded.
 */
export class NavBar {
  readonly menuToggle: Locator;
  readonly menu: Locator;
  readonly homeLink: Locator;
  readonly cartLink: Locator;
  readonly logInLink: Locator;
  readonly signUpLink: Locator;
  readonly logOutLink: Locator;
  readonly welcomeText: Locator;

  constructor(private readonly page: Page) {
    this.menuToggle = page.locator('button.navbar-toggler');
    this.menu = page.locator('#navbarExample');
    this.homeLink = this.menu.getByRole('link', { name: /^Home/ });
    this.cartLink = page.locator('#cartur');
    this.logInLink = page.locator('#login2');
    this.signUpLink = page.locator('#signin2');
    this.logOutLink = page.locator('#logout2');
    this.welcomeText = page.locator('#nameofuser');
  }

  async expandIfCollapsed(): Promise<void> {
    if ((await this.menuToggle.isVisible()) && !(await this.menu.isVisible())) {
      await this.menuToggle.click();
      await expect(this.menu).toBeVisible();
    }
  }

  async openLogin(): Promise<void> {
    await this.expandIfCollapsed();
    await this.logInLink.click();
  }

  async openSignUp(): Promise<void> {
    await this.expandIfCollapsed();
    await this.signUpLink.click();
  }

  async goToCart(): Promise<void> {
    await this.expandIfCollapsed();
    await Promise.all([this.page.waitForURL(/\/cart\.html/), this.cartLink.click()]);
  }

  async goHome(): Promise<void> {
    await this.expandIfCollapsed();
    await Promise.all([this.page.waitForURL(/\/index\.html|\/$/), this.homeLink.click()]);
  }

  async logOut(): Promise<void> {
    await this.expandIfCollapsed();
    await Promise.all([this.page.waitForURL(/\/index\.html/), this.logOutLink.click()]);
  }

  async expectLoggedInAs(username: string): Promise<void> {
    await expect(this.welcomeText).toHaveText(`Welcome ${username}`);
    await expect(this.logInLink).toBeHidden();
    await expect(this.signUpLink).toBeHidden();
  }

  async expectLoggedOut(): Promise<void> {
    await this.expandIfCollapsed();
    await expect(this.logInLink).toBeVisible();
    await expect(this.signUpLink).toBeVisible();
    await expect(this.logOutLink).toBeHidden();
    await expect(this.welcomeText).toBeHidden();
  }
}
