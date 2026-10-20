import { randomUUID } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { encodePassword } from '../utils/encoding';
import { ApiCallLog } from './ApiCallLog';

export interface CartItem {
  id: string;
  prod_id: number;
  cookie: string;
}

export interface ApiProduct {
  id: number;
  title: string;
  price: number;
  cat: string;
  desc: string;
  img: string;
}

export interface ApiErrorBody {
  errorMessage: string;
}

const AUTH_PREFIX = 'Auth_token: ';

/**
 * Thin client for the DemoBlaze REST API (https://api.demoblaze.com).
 * Used by API tests directly and by UI tests for fast, reliable setup (API-first arrange).
 * All endpoints are POST + JSON except GET /entries; errors come back as HTTP 200 + { errorMessage }.
 */
export class DemoblazeApi {
  /** Every call made through this client, for the test report (secrets masked). */
  readonly log = new ApiCallLog();

  constructor(private readonly request: APIRequestContext) {}

  private async send(
    method: 'GET' | 'POST',
    path: string,
    data?: Record<string, unknown>,
  ): Promise<APIResponse> {
    const startedAt = Date.now();
    const response =
      method === 'GET' ? await this.request.get(path) : await this.request.post(path, { data });
    await this.log.record(method, response.url(), data, startedAt, response);
    return response;
  }

  // ---------- raw endpoint calls (return the response, used by API tests) ----------

  signUp(username: string, password: string): Promise<APIResponse> {
    return this.send('POST', '/signup', { username, password: encodePassword(password) });
  }

  login(username: string, password: string): Promise<APIResponse> {
    return this.send('POST', '/login', { username, password: encodePassword(password) });
  }

  check(token: string): Promise<APIResponse> {
    return this.send('POST', '/check', { token });
  }

  entries(): Promise<APIResponse> {
    return this.send('GET', '/entries');
  }

  view(productId: number | string): Promise<APIResponse> {
    return this.send('POST', '/view', { id: String(productId) });
  }

  async addToCart(token: string, productId: number): Promise<{ response: APIResponse; itemId: string }> {
    const itemId = randomUUID();
    const response = await this.send('POST', '/addtocart', {
      id: itemId,
      cookie: token,
      prod_id: productId,
      flag: true,
    });
    return { response, itemId };
  }

  viewCartRaw(token: string): Promise<APIResponse> {
    return this.send('POST', '/viewcart', { cookie: token, flag: true });
  }

  deleteItem(itemId: string): Promise<APIResponse> {
    return this.send('POST', '/deleteitem', { id: itemId });
  }

  // ---------- helpers for test setup (throw with a clear message on failure) ----------

  async createUser(username: string, password: string): Promise<void> {
    const response = await this.signUp(username, password);
    const body = await response.text();
    if (!response.ok() || body.includes('errorMessage')) {
      throw new Error(`Sign up failed for "${username}": HTTP ${response.status()} ${body}`);
    }
  }

  async getToken(username: string, password: string): Promise<string> {
    const response = await this.login(username, password);
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok() || typeof body !== 'string' || !body.startsWith(AUTH_PREFIX)) {
      throw new Error(`Login failed for "${username}": HTTP ${response.status()} ${JSON.stringify(body)}`);
    }
    return body.slice(AUTH_PREFIX.length);
  }

  async viewCart(token: string): Promise<CartItem[]> {
    const response = await this.viewCartRaw(token);
    const body = (await response.json()) as { Items?: CartItem[] } & Partial<ApiErrorBody>;
    if (!response.ok() || body.errorMessage) {
      throw new Error(`View cart failed: HTTP ${response.status()} ${JSON.stringify(body)}`);
    }
    return body.Items ?? [];
  }

  async addProducts(token: string, productIds: readonly number[]): Promise<string[]> {
    const ids: string[] = [];
    // Sequential on purpose: keeps the order of cart items predictable and avoids racing writes to one cart.
    for (const productId of productIds) {
      const { response, itemId } = await this.addToCart(token, productId);
      if (!response.ok()) throw new Error(`Add to cart failed for product ${productId}`);
      ids.push(itemId);
    }
    const saved = (await this.viewCart(token)).map((item) => item.id);
    const missing = ids.filter((id) => !saved.includes(id));
    if (missing.length > 0) {
      throw new Error(`Cart setup incomplete: ${missing.length} of ${ids.length} items were not saved`);
    }
    return ids;
  }

  async clearCart(token: string): Promise<void> {
    for (const item of await this.viewCart(token)) {
      await this.deleteItem(item.id);
    }
  }
}
