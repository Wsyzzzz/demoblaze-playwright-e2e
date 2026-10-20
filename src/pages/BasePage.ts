import type { Page } from '@playwright/test';
import { NavBar } from './components/NavBar';

/** Common base for full pages: every page has the navigation bar. */
export abstract class BasePage {
  readonly navBar: NavBar;

  protected constructor(protected readonly page: Page) {
    this.navBar = new NavBar(page);
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }
}
