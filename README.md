# DemoBlaze E2E Test Automation Framework

End-to-end test automation for the [DemoBlaze](https://www.demoblaze.com/) demo store, covering the **Login** and **Cart / Checkout** features with **Playwright + TypeScript**.

The framework runs UI, API, security and performance checks from one code base, across Chromium, Firefox, WebKit and an emulated mobile device, and plugs into GitHub Actions or Jenkins.

|                  |                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Test cases**   | 82 documented in [`docs/DemoBlaze_Test_Cases.xlsx`](docs/DemoBlaze_Test_Cases.xlsx)                              |
| **Automated**    | 32 test cases → 85 test runs across 6 Playwright projects                                                        |
| **Traceability** | [`docs/traceability.md`](docs/traceability.md): every case with its spec file, or the reason it is not automated |
| **Stack**        | Playwright 1.59 · TypeScript 5.9 · Node.js ≥ 20 · ESLint · Prettier · k6 (optional)                              |

---

## Contents

1. [Quick start](#1-quick-start)
2. [Running the tests](#2-running-the-tests)
3. [Project structure](#3-project-structure)
4. [Design decisions and rationale](#4-design-decisions-and-rationale)
5. [What is automated and why](#5-what-is-automated-and-why)
6. [Reports](#6-reports)
7. [CI/CD](#7-cicd)
8. [Configuration](#8-configuration)
9. [Known defects](#9-known-defects)
10. [Conventions for contributors](#10-conventions-for-contributors)
11. [Roadmap](#11-roadmap)

---

## 1. Quick start

**Prerequisites:** Node.js 20 or later, and Git.

```bash
git clone <this-repo-url>
cd demoblaze-playwright-e2e

npm ci                          # install exact dependency versions
npx playwright install          # download Chromium, Firefox and WebKit
cp .env.example .env            # optional: defaults work without changes

npm run test:smoke              # critical path: 7 tests (5 UI on Chromium + 2 API)
npm run report                  # open the HTML report
```

No credentials are needed. By default each test worker **signs up its own throwaway account** through the API (see [4.4](#44-test-data-isolation-one-account-per-worker)).

---

## 2. Running the tests

| Goal                                                                 | Command                                                                |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Smoke suite: critical path on Chromium + API                         | `npm run test:smoke`                                                   |
| Full regression: all browsers, mobile and API                        | `npm run test:regression`                                              |
| Everything, including performance                                    | `npm test`                                                             |
| One browser only                                                     | `npm run test:ui` (Chromium) · `npx playwright test --project=firefox` |
| API tests only                                                       | `npm run test:api`                                                     |
| Mobile emulation (Pixel 7)                                           | `npm run test:mobile`                                                  |
| Performance budget check                                             | `npm run test:perf`                                                    |
| Watch the browser                                                    | `npm run test:headed`                                                  |
| Step through with the inspector                                      | `npm run test:debug`                                                   |
| By tag                                                               | `npx playwright test --grep @security`                                 |
| One test case by ID                                                  | `npx playwright test --grep "CRT-025"`                                 |
| Load test (needs [k6](https://k6.io/docs/get-started/installation/)) | `npm run perf:load`                                                    |

**Demo flows from the brief:**

```bash
# Logging in with valid credentials
npx playwright test --grep "LGN-004" --project=chromium --headed

# Add to cart, then place an order (full UI journey)
npx playwright test --grep "CRT-025" --project=chromium --headed
```

**Running against your own account** instead of throwaway users:

```bash
# in .env
USER_STRATEGY=env
VALID_USER=your_username
VALID_PASSWORD=your_password
```

The framework switches to a single worker automatically in this mode, so tests do not overwrite each other's cart.

### Quality checks

```bash
npm run lint          # ESLint, including eslint-plugin-playwright rules
npm run format:check  # Prettier
npm run typecheck     # tsc --noEmit
```

---

## 3. Project structure

```
demoblaze-playwright-e2e/
├── .github/workflows/e2e.yml     # CI: quality gate → smoke / regression matrix / perf
├── Jenkinsfile                   # Same pipeline for Jenkins (Playwright Docker image)
├── playwright.config.ts          # Projects (browsers, mobile, api, perf), reporters, retries, timeouts
├── .env.example                  # Every configurable value, documented
│
├── src/                          # Framework code – no test cases here
│   ├── config/env.ts             # Typed, validated configuration (environments + overrides)
│   ├── api/DemoblazeApi.ts       # API client: used by API tests and for fast test setup
│   ├── pages/                    # Page Object Model
│   │   ├── BasePage.ts
│   │   ├── HomePage.ts
│   │   ├── ProductPage.ts
│   │   ├── CartPage.ts
│   │   └── components/           # Reusable UI parts shared by several pages
│   │       ├── NavBar.ts         #   handles the collapsed mobile menu transparently
│   │       ├── LoginModal.ts
│   │       ├── SignUpModal.ts
│   │       ├── PlaceOrderModal.ts
│   │       └── OrderConfirmation.ts
│   ├── fixtures/
│   │   ├── index.ts              # Custom test(): page objects, api, testUser, session
│   │   └── known-defect.ts       # Expected-to-fail handling + defect register
│   ├── data/                     # Test data, kept out of the specs
│   │   ├── products.ts           #   catalogue (verified against GET /entries)
│   │   ├── checkout.ts           #   checkout form data
│   │   ├── login-validation.json #   data-driven login cases
│   │   └── order-validation.ts   #   data-driven checkout cases
│   ├── constants/                # Tags and user-facing messages
│   └── utils/                    # Dialog handling, encoding, dates, random data
│
├── tests/                        # Specs, grouped by test type, then feature
│   ├── ui/
│   │   ├── auth/                 #   signup, login, session/logout
│   │   ├── cart/                 #   add to cart, cart management
│   │   └── checkout/             #   place order, order validation
│   ├── api/                      #   auth, cart, product endpoints
│   ├── security/                 #   session/cookie checks
│   └── perf/                     #   page performance budgets
│
├── perf/k6/api-load.js           # Optional load test (k6)
├── scripts/ci-summary.mjs        # Writes the GitHub Actions job summary
└── docs/
    ├── DemoBlaze_Test_Cases.xlsx # Test case suite (82 cases) + potential defects
    └── traceability.md           # Test case → spec file mapping
```

---

## 4. Design decisions and rationale

### 4.1 Playwright + TypeScript

- **Playwright** has one API for Chromium, Firefox and WebKit plus device emulation, which covers the cross-browser/platform requirement. It also has built-in API testing, auto-waiting (fewer flaky waits), parallel execution and trace-based debugging.
- **TypeScript** catches mistakes at compile time: wrong fixture names, mistyped data fields, renamed page methods. That matters once a suite grows past a few files.

### 4.2 Page Object Model with components

Each page exposes **locators and user-level actions** (`addToCart()`, `openPlaceOrder()`), and the specs read like test cases. UI parts that appear on several pages (navigation bar, login modal, order form, confirmation dialog) are **components**, so a UI change is fixed in exactly one place.

Locator strategy, in order of preference:

1. The stable IDs the site already uses (`#loginusername`, `#orderModal`).
2. Role-based locators scoped to a container (`root.getByRole('button', { name: 'Purchase' })`).
3. No XPath, and no positional selectors where a meaningful one exists.

### 4.3 Fixtures instead of setup code in tests

`src/fixtures/index.ts` extends Playwright's `test` so specs simply ask for what they need:

```ts
test('CRT-013 ...', async ({ session, api, cartPage }) => { ... });
```

| Fixture                                 | Scope      | What it gives the test                                                                    |
| --------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `homePage`, `cartPage`, `loginModal`, … | test       | Page objects for the current page                                                         |
| `api`                                   | test       | `DemoblazeApi` client                                                                     |
| `testUser`                              | **worker** | An account owned by this worker for the whole run                                         |
| `session`                               | test       | `testUser` logged in **via the API**, cart emptied, auth cookie injected into the browser |

### 4.4 Test data isolation: one account per worker

DemoBlaze stores the cart **per user on the server**. If parallel tests shared one account, they would see each other's cart items and fail at random.

So each Playwright worker signs up its **own throwaway account** (`qa_w<n>_<timestamp>_<random>`) once, and every `session` starts with an **empty cart**. This makes the suite:

- **Parallel-safe:** no shared state between workers.
- **Order-independent:** any test can run alone (`--grep CRT-013`).
- **Secret-free in CI:** no passwords to store or rotate.

`USER_STRATEGY=env` remains available for running against a named account.

### 4.5 API-first arrange, UI for the behaviour under test

A test should spend its time on the behaviour it checks. Preconditions such as logging in or putting two items in the cart are done **through the API** (milliseconds, no UI flakiness). The UI is used for the action and assertions under test.

The exceptions are deliberate:

- **CRT-025**, the business-critical journey from the brief, runs **fully through the UI**.
- **LGN-004** and **LGN-027** log in through the UI, because the login itself (or the cookie the site sets) is what they test.

### 4.6 Deterministic waits, never `waitForTimeout`

DemoBlaze loads cart rows asynchronously and reloads pages after login and delete. Instead of sleeping, the framework waits for the **real signal**:

| Situation        | What the framework waits for                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Cart page        | The `/viewcart` response, before asserting, so an "empty cart" check cannot pass early                   |
| Login            | The page `load` event the site triggers                                                                  |
| Delete from cart | The `/viewcart` call after the reload                                                                    |
| Order placed     | Server-side cart state (`expect.poll`), because the site empties the cart with a fire-and-forget request |

Native `alert()` dialogs are handled by `acceptNextDialog()`. It registers the handler before the click, because some DemoBlaze alerts fire synchronously inside the click handler.

### 4.7 Known defects as expected failures

The manual run found real defects (see [section 9](#9-known-defects)). Their tests are written to the **correct** expected behaviour and marked `test.fail()` with the defect ID:

- CI stays **green** while the defect is open.
- The report lists them separately with their defect ID (tag `@known-defect`).
- When the defect is fixed, the test **passes unexpectedly and CI fails**, prompting someone to remove the marker. Defects cannot be silently fixed or silently reintroduced.

### 4.8 One defect, one failing test

Assertions are scoped to the test case's objective. For example, the end-to-end order test (CRT-025) does **not** check the date, because CRT-027 owns that. One defect fails one test, so the failure count reflects real problems.

### 4.9 Tags and projects

| Tag                                        | Meaning                                           |
| ------------------------------------------ | ------------------------------------------------- |
| `@smoke`                                   | Critical path, run on every push and PR           |
| `@regression`                              | Full suite, run nightly                           |
| `@api` · `@security` · `@perf` · `@mobile` | Test type                                         |
| `@known-defect`                            | Expected to fail until the linked defect is fixed |

| Project                         | Runs                                              |
| ------------------------------- | ------------------------------------------------- |
| `chromium`, `firefox`, `webkit` | UI and security specs on desktop browsers         |
| `mobile-chrome`                 | `@smoke` + `@mobile` specs on an emulated Pixel 7 |
| `api`                           | API specs once, with no browser (fast)            |
| `perf`                          | Performance budgets on Chromium, without retries  |

### 4.10 Configuration

`src/config/env.ts` validates every setting at start-up and fails fast with a clear message (for example, an unknown `TEST_ENV`). Environments are defined in one map, so adding staging/UAT is a single entry. Any value can be overridden by an environment variable for CI.

---

## 5. What is automated and why

Every one of the 82 test cases was assessed on four criteria:

1. **Regression value:** will this protect us on every release?
2. **Determinism:** is there a single stable expected result?
3. **Cost and stability:** can it be automated without being flaky or slow?
4. **Safety:** can it run repeatedly against a shared environment without harm?

| Decision                      | Cases | Typical examples                                                                                                                                                |
| ----------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Automated**                 | 26    | Login (valid/invalid/required fields), session, logout, add to cart, delete, full checkout, checkout validation, API contract, mobile login, performance budget |
| **Automated as known defect** | 6     | Wrong order date, empty-cart order, predictable token, cookie flags, HTTP 200 for errors                                                                        |
| **Backlog**                   | 25    | Automatable but lower priority: persistence after re-login, cart isolation between users, category/pagination, 10-item total                                    |
| **Manual**                    | 25    | See reasons below                                                                                                                                               |

Why some cases stay **manual**:

- **Requirement not confirmed:** for example card-number validation that the site does not have. Automate once the product owner agrees the rule; until then it is a potential defect, not a regression check.
- **Timing races** (double-clicks, rapid clicks): non-deterministic by nature and would make the suite flaky.
- **Destructive on a shared environment:** account lockout after failed logins would lock real users out.
- **Human judgement or specialist tooling:** visual layout, XSS/transport security (better in a DAST tool).

The full per-case decision is in [`docs/traceability.md`](docs/traceability.md) and in the _Automation_ columns of the workbook.

---

## 6. Reports

Every run writes to `reports/`:

| Output      | Path                        | Use                                                          |
| ----------- | --------------------------- | ------------------------------------------------------------ |
| HTML report | `reports/html/index.html`   | `npm run report`: steps, errors, screenshots, videos, traces |
| JUnit XML   | `reports/junit/results.xml` | Jenkins / Azure DevOps / test-management import              |
| JSON        | `reports/json/results.json` | Custom dashboards; used for the GitHub job summary           |
| Artifacts   | `reports/test-results/`     | Trace, screenshot and video, **kept only for failed tests**  |

To debug a CI failure, download the report artifact and run `npx playwright show-trace <trace.zip>` to replay the test step by step: DOM, network and console included.

The performance test attaches `cart-page-metrics.json` (time to cart ready, DOMContentLoaded, load, transfer size) to the report on every run, so trends are visible even when the budget passes.

---

## 7. CI/CD

### GitHub Actions: `.github/workflows/e2e.yml`

```
            ┌──────────────────────┐
push / PR ─▶│ quality              │──▶ smoke (Chromium + API)
            │ lint · format · tsc  │
nightly   ─▶│                      │──▶ regression matrix: chromium │ firefox │ webkit │ mobile-chrome │ api
            └──────────────────────┘──▶ perf
manual    ─▶ workflow_dispatch: choose smoke / regression / perf
```

- The **quality gate** runs first, so broken code never reaches the browser stage.
- The regression matrix runs **one job per project in parallel** with `fail-fast: false`, so one browser's failure does not hide another's.
- Every job publishes its report as an artifact and writes a **job summary** (passed, failed, flaky, plus known defects).
- No secrets are required (see [4.4](#44-test-data-isolation-one-account-per-worker)).

### Jenkins: `Jenkinsfile`

A declarative pipeline running in the official `mcr.microsoft.com/playwright` Docker image, so browsers and OS dependencies are pre-installed. It has a `SUITE` parameter (smoke / regression / perf), a nightly trigger, the same quality gate, JUnit results and the HTML report published on the build page.

---

## 8. Configuration

All settings live in `.env` (copy `.env.example`); environment variables override them.

| Variable                        | Default             | Purpose                                                            |
| ------------------------------- | ------------------- | ------------------------------------------------------------------ |
| `TEST_ENV`                      | `prod`              | Named environment from `src/config/env.ts`                         |
| `BASE_URL` / `API_URL`          | DemoBlaze URLs      | Override the environment's URLs                                    |
| `USER_STRATEGY`                 | `per-worker`        | `per-worker` (throwaway accounts) or `env` (use the account below) |
| `VALID_USER` / `VALID_PASSWORD` | —                   | Account for `USER_STRATEGY=env`                                    |
| `TIMEZONE`                      | `Asia/Kuala_Lumpur` | Browser timezone (used by the order-date check)                    |
| `CART_PAGE_BUDGET_MS`           | `3000`              | Performance budget for CRT-019                                     |

Retries (1 on CI, 0 locally), timeouts and workers are set in `playwright.config.ts`.

---

## 9. Known defects

Found during manual testing and kept as expected-to-fail automated tests (full list of 21 potential defects in the workbook):

| Defect | Summary                                                                        | Test             |
| ------ | ------------------------------------------------------------------------------ | ---------------- |
| PD-01  | Order can be placed with an empty cart ("Amount: 0 USD")                       | CRT-029          |
| PD-02  | Confirmation date shows the previous month (0-based month)                     | CRT-027          |
| PD-08  | Auth cookie `tokenp_` has no Secure/HttpOnly flags                             | LGN-027          |
| PD-18  | Auth token is Base64 of username + number, so it is predictable                | LGN-026          |
| PD-19  | API returns HTTP 200 for errors (should be 401/404)                            | LGN-034, CRT-048 |
| PD-06  | Guest alert text "Product added" lacks the full stop (annotated, not asserted) | CRT-007          |

---

## 10. Conventions for contributors

- **Test title** = `<TC ID> <title from the workbook>`, e.g. `CRT-025 Verify a logged-in user can place an order with valid details`.
- **One objective per test**, with assertions focused on it.
- **No `waitForTimeout`**: wait for a response, event or web-first assertion.
- **No credentials in code**: use `.env` (git-ignored) or CI secrets.
- **Selectors live only in page objects**, never in specs.
- **Arrange through the API** unless the arrangement itself is under test.
- Run `npm run lint && npm run typecheck` before pushing; CI enforces both.

---

## 11. Roadmap

- Automate the 25 backlog cases, starting with cart isolation between two users (CRT-022, P1).
- Visual regression snapshots for the cart and confirmation dialog.
- Allure or a test-management integration (for example Xray/Zephyr) driven by the JUnit output.
- Sharded runs (`--shard`) once the suite outgrows a single job.
- Accessibility checks with `@axe-core/playwright`.
