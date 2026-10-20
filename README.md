# DemoBlaze E2E Test Automation Framework

End-to-end test automation for the [DemoBlaze](https://www.demoblaze.com/) demo store, covering the **Login** and **Cart / Checkout** features with **Playwright + TypeScript**.

The framework runs UI, API, security and performance checks from one code base, across Chromium, Firefox, WebKit and an emulated mobile device, and plugs into GitHub Actions or Jenkins.

|                  |                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Test cases**   | 84 documented in [`docs/DemoBlaze_Test_Cases.xlsx`](docs/DemoBlaze_Test_Cases.xlsx)                              |
| **Automated**    | 63 test cases → 173 test runs in a full run, plus the performance budget run on its own                          |
| **Traceability** | [`docs/traceability.md`](docs/traceability.md): every case with its spec file, or the reason it is not automated |
| **Stack**        | Playwright 1.59 · TypeScript 5.9 · Node.js ≥ 20 · ESLint · Prettier · k6 (optional)                              |

---

## Contents

1. [Quick start](#1-quick-start)
2. [Run the demo](#2-run-the-demo)
3. [Running the tests](#3-running-the-tests)
4. [Project structure](#4-project-structure)
5. [Design decisions and rationale](#5-design-decisions-and-rationale)
6. [What is automated and why](#6-what-is-automated-and-why)
7. [Reports](#7-reports)
8. [CI/CD](#8-cicd)
9. [Configuration](#9-configuration)
10. [Known defects](#10-known-defects)

---

## 1. Quick start

**Prerequisites:** Node.js 20 or later, and Git.

```bash
git clone <this-repo-url>
cd demoblaze-playwright-e2e

npm ci                          # install exact dependency versions
npx playwright install          # download Chromium, Firefox and WebKit
cp .env.example .env            # optional: defaults work without changes

npm run demo                    # the two demo flows from the brief, in a visible browser
npm run test:smoke              # critical path: 7 tests (5 UI on Chromium + 2 API)
npm run report                  # open the HTML report of the latest run
```

No credentials are needed. By default each test worker **signs up its own throwaway account** through the API (see [5.4](#54-test-data-isolation-one-account-per-worker)).

---

## 2. Run the demo

The challenge asks for a demo of two flows. Each command opens a **visible Chrome window** and runs the tests **one at a time** so you can follow along on [demoblaze.com](https://www.demoblaze.com/).

```bash
npm run demo              # LGN-004 login + CRT-025 add to cart and place an order
npm run demo:edge-cases   # wrong password, unknown user, empty fields, empty-cart order
npm run report            # open the HTML report with every step
```

| Test        | Flow                                               | What it validates                                                                                                                                                                                                                                            |
| ----------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **LGN-004** | Logging in with valid credentials                  | Login modal closes; navbar shows `Welcome <username>` and `Log out`; `Log in` / `Sign up` are hidden                                                                                                                                                         |
| **CRT-025** | Add to cart, then place an order (full UI journey) | Adds Samsung galaxy s6 ($360) and Nokia lumia 1520 ($820) from the Home page; cart lists both rows with Total **1180**; order form shows `Total: 1180`; receipt shows a numeric Id, `Amount: 1180 USD` and the card and name entered; **OK** returns to Home |

Edge cases shown by `npm run demo:edge-cases`:

| Test    | Scenario                             | Expected handling                                                                                                                                                      |
| ------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LGN-006 | Wrong password                       | Alert `Wrong password.`; user stays logged out                                                                                                                         |
| LGN-007 | Unregistered username                | Alert `User does not exist.`                                                                                                                                           |
| LGN-008 | Both login fields empty              | Alert `Please fill out Username and Password.`; no login request sent                                                                                                  |
| CRT-032 | Purchase with all order fields empty | Alert `Please fill out Name and Creditcard.`; no order, cart unchanged                                                                                                 |
| CRT-029 | Order with an empty cart             | **Known defect PD-01**: the site accepts it (`Amount: 0 USD`). The test asserts the correct behaviour and is marked expected-to-fail ([section 10](#10-known-defects)) |

Prefer to type the commands yourself? The npm scripts are shortcuts for:

```bash
npx playwright test --grep "LGN-004|CRT-025" --project=chromium --headed --workers=1
npx playwright test --grep "LGN-006|LGN-007|LGN-008|CRT-029|CRT-032" --project=chromium --headed --workers=1
```

To step through a demo test line by line: `npx playwright test --grep "CRT-025" --project=chromium --debug`.

---

## 3. Running the tests

| Goal                                                                 | Command                                                                |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Smoke suite: critical path on Chromium + API                         | `npm run test:smoke`                                                   |
| Full regression: all browsers, mobile and API                        | `npm run test:regression`                                              |
| Everything except performance (all browsers, mobile, API)            | `npm test`                                                             |
| One browser only                                                     | `npm run test:ui` (Chromium) · `npx playwright test --project=firefox` |
| API tests only                                                       | `npm run test:api`                                                     |
| Mobile emulation (Pixel 7)                                           | `npm run test:mobile`                                                  |
| Performance budget check (runs on its own, see below)                | `npm run test:perf`                                                    |
| Watch the browser                                                    | `npm run test:headed`                                                  |
| Step through with the inspector                                      | `npm run test:debug`                                                   |
| By tag                                                               | `npx playwright test --grep @security`                                 |
| One test case by ID                                                  | `npx playwright test --grep "CRT-025"`                                 |
| Load test (needs [k6](https://k6.io/docs/get-started/installation/)) | `npm run perf:load`                                                    |

The demo flows from the brief have their own section: [2. Run the demo](#2-run-the-demo).

**Why performance runs separately:** a time budget only means something on a quiet machine and network. In the middle of a full run the page competes with about 160 other browser tests for CPU and bandwidth, so the measurement reflects the test run, not the site. `npx playwright test` therefore leaves the `perf` project out, and it runs when you ask for it (`npm run test:perf`, `--project=perf`, or a path under `tests/perf`). CI already runs it as its own job.

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

## 4. Project structure

```
demoblaze-playwright-e2e/
├── .github/workflows/e2e.yml     # CI: quality gate → smoke / regression matrix / perf
├── Jenkinsfile                   # Same pipeline for Jenkins (Playwright Docker image)
├── playwright.config.ts          # Projects (browsers, mobile, api, perf), reporters, retries, timeouts
├── .env.example                  # Every configurable value, documented
│
├── src/                          # Framework code – no test cases here
│   ├── config/env.ts             # Typed, validated configuration (environments + overrides)
│   ├── config/reports.ts         # One HTML report per run; old ones pruned by global-setup.ts
│   ├── config/health-check.ts    # Is DemoBlaze up? Checked once before every run
│   ├── api/DemoblazeApi.ts       # API client: used by API tests and for fast test setup
│   ├── api/ApiCallLog.ts         # Request/response history for the report (secrets masked)
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
│   │   ├── known-defect.ts       # Expected-to-fail handling + defect register
│   │   └── evidence.ts           # Keeps screenshot/video/API-log evidence for known defects
│   ├── data/                     # Test data, kept out of the specs
│   │   ├── products.ts           #   catalogue (verified against GET /entries)
│   │   ├── checkout.ts           #   checkout form data
│   │   ├── login-validation.json #   data-driven login cases
│   │   └── order-validation.ts   #   data-driven checkout cases
│   ├── constants/                # Tags and user-facing messages
│   └── utils/                    # Dialog handling, form filling, encoding, dates, random data
│
├── tests/                        # Specs, grouped by test type, then feature
│   ├── ui/
│   │   ├── auth/                 #   signup, login, session/logout
│   │   ├── cart/                 #   add to cart, cart management, persistence and isolation
│   │   └── checkout/             #   place order, order validation
│   ├── api/                      #   auth, cart, product endpoints
│   ├── security/                 #   login security (injection, lockout, HTTPS), session/cookie checks
│   └── perf/                     #   page performance budgets
│
├── perf/k6/api-load.js           # Optional load test (k6)
├── scripts/ci-summary.mjs        # Writes the GitHub Actions job summary
├── scripts/open-report.mjs       # npm run report: opens the latest (or a chosen) run's report
└── docs/
    ├── DemoBlaze_Test_Cases.xlsx # Test case suite (84 cases) + potential defects
    └── traceability.md           # Test case → spec file mapping
```

---

## 5. Design decisions and rationale

### 5.1 Playwright + TypeScript

- **Playwright** has one API for Chromium, Firefox and WebKit plus device emulation, which covers the cross-browser/platform requirement. It also has built-in API testing, auto-waiting (fewer flaky waits), parallel execution and trace-based debugging.
- **TypeScript** catches mistakes at compile time: wrong fixture names, mistyped data fields, renamed page methods. That matters once a suite grows past a few files.

### 5.2 Page Object Model with components

Each page exposes **locators and user-level actions** (`addToCart()`, `openPlaceOrder()`), and the specs read like test cases. UI parts that appear on several pages (navigation bar, login modal, order form, confirmation dialog) are **components**, so a UI change is fixed in exactly one place.

Locator strategy, in order of preference:

1. The stable IDs the site already uses (`#loginusername`, `#orderModal`).
2. Role-based locators scoped to a container (`root.getByRole('button', { name: 'Purchase' })`).
3. No XPath, and no positional selectors where a meaningful one exists.

### 5.3 Fixtures instead of setup code in tests

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

### 5.4 Test data isolation: one account per worker

DemoBlaze stores the cart **per user on the server**. If parallel tests shared one account, they would see each other's cart items and fail at random.

So each Playwright worker signs up its **own throwaway account** (`qa_w<n>_<timestamp>_<random>`) once, and every `session` starts with an **empty cart**. This makes the suite:

- **Parallel-safe:** no shared state between workers.
- **Order-independent:** any test can run alone (`--grep CRT-013`).
- **Secret-free in CI:** no passwords to store or rotate.

`USER_STRATEGY=env` remains available for running against a named account.

### 5.5 API-first arrange, UI for the behaviour under test

A test should spend its time on the behaviour it checks. Preconditions such as logging in or putting two items in the cart are done **through the API** (milliseconds, no UI flakiness). The UI is used for the action and assertions under test.

The exceptions are deliberate:

- **CRT-025**, the business-critical journey from the brief, runs **fully through the UI**.
- **LGN-004** and **LGN-027** log in through the UI, because the login itself (or the cookie the site sets) is what they test.
- **Guest journeys start on the Home page**, because that is where DemoBlaze creates the guest id. Landing on a product page directly is covered separately by CRT-049, which exposed defect PD-22. Opening `cart.html` directly as a guest is just as harmful: it loads the shared guest cart (hundreds of items, one API call each) and slows the API down for every test running at the same time.

### 5.6 Deterministic waits, never `waitForTimeout`

DemoBlaze loads cart rows asynchronously and reloads pages after login and delete. Instead of sleeping, the framework waits for the **real signal**:

| Situation        | What the framework waits for                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cart page        | The `/viewcart` response, before asserting, so an "empty cart" check cannot pass early                                                                                                             |
| Login            | The page `load` event the site triggers                                                                                                                                                            |
| Delete from cart | The `/viewcart` call after the reload                                                                                                                                                              |
| Order placed     | The site's own `POST /deletecart` response before pressing OK (`purchaseAndWaitForCartClear`), then the server-side cart state (`expect.poll`). Pressing OK sooner cancels that call: defect PD-28 |
| Purchase dialog  | The SweetAlert `visible` class: its OK button only works once the opening animation has finished                                                                                                   |
| Modal forms      | Every typed value is verified (`fillAndVerify`), because Bootstrap moves focus when a modal finishes opening and can interrupt typing on Firefox/WebKit                                            |

Native `alert()` dialogs are handled by `acceptNextDialog()`. It registers the handler before the click, because some DemoBlaze alerts fire synchronously inside the click handler.

### 5.7 Known defects as expected failures

The manual run found real defects (see [section 10](#10-known-defects)). Their tests are written to the **correct** expected behaviour and marked `test.fail()` with the defect ID:

- CI stays **green** while the defect is open.
- The report lists them separately with their defect ID (tag `@known-defect`).
- When the defect is fixed, the test **passes unexpectedly and CI fails**, prompting someone to remove the marker. Defects cannot be silently fixed or silently reintroduced.

### 5.8 One defect, one failing test

Assertions are scoped to the test case's objective. For example, the end-to-end order test (CRT-025) does **not** check the date, because CRT-027 owns that. One defect fails one test, so the failure count reflects real problems.

### 5.9 Tags and projects

| Tag                                        | Meaning                                           |
| ------------------------------------------ | ------------------------------------------------- |
| `@smoke`                                   | Critical path, run on every push and PR           |
| `@regression`                              | Full suite, run nightly                           |
| `@api` · `@security` · `@perf` · `@mobile` | Test type                                         |
| `@known-defect`                            | Expected to fail until the linked defect is fixed |
| `@pd-01` … `@pd-28`                        | The defect a known-defect test belongs to         |
| `@chromium-only`                           | Left out of the Firefox and WebKit projects       |

| Project                         | Runs                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `chromium`, `firefox`, `webkit` | UI and security specs on desktop browsers (`@chromium-only` on Chromium only) |
| `mobile-chrome`                 | `@smoke` + `@mobile` specs on an emulated Pixel 7                             |
| `api`                           | API specs once, with no browser (fast)                                        |
| `perf`                          | Performance budgets on Chromium, without retries; only when selected          |

### 5.10 Configuration

`src/config/env.ts` validates every setting at start-up and fails fast with a clear message (for example, an unknown `TEST_ENV`). Environments are defined in one map, so adding staging/UAT is a single entry. Any value can be overridden by an environment variable for CI.

---

## 6. What is automated and why

Every one of the 84 test cases was assessed on four criteria:

1. **Regression value:** will this protect us on every release?
2. **Determinism:** is there a single stable expected result?
3. **Cost and stability:** can it be automated without being flaky or slow?
4. **Safety:** can it run repeatedly against a shared environment without harm?

| Decision                      | Cases | Typical examples                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Automated**                 | 45    | Login (valid, invalid, required fields, special characters, long input), sign-up, session, logout, add to cart, rapid repeated add to cart, categories, delete, 10-item total, persistence, cart isolation between users, full checkout, checkout validation, cookie tampering, HTTPS, API contract, mobile login and cart, performance budget |
| **Automated as known defect** | 18    | Wrong order date, empty-cart order, shared guest cart, cart not emptied after a quick OK, no login lockout, double submit, predictable token, cookie flags, readable password, HTTP 200 for errors, unconfirmed login rules (spaces, case, Enter key)                                                                                          |
| **Backlog**                   | 10    | Automatable, lower priority: price consistency across pages, stale order amount, logged-in state on every page, unknown product page                                                                                                                                                                                                           |
| **Manual**                    | 11    | See reasons below                                                                                                                                                                                                                                                                                                                              |

Why some cases stay **manual**:

- **Checkout rules not agreed yet** (card number, expiry, required fields, masking: CRT-035–040, CRT-044–045): the site has no such validation. Agree the rules with the product owner first, then automate them.
- **Human judgement or specialist tooling:** visual layout (CRT-041), console-error judgement (CRT-004), XSS probing (CRT-042, better in a DAST tool).

Where the expected behaviour is an assumption but the site's current behaviour is stable (for example the login rules for spaces and letter case), the case is automated as a known defect, so any change in behaviour is flagged.

The full per-case decision is in [`docs/traceability.md`](docs/traceability.md) and in the _Automation_ columns of the workbook.

---

## 7. Reports

Every run writes to `reports/`. **The HTML report is kept per run**: each local run gets its own folder named with the date and time it started, for example `reports/html/test_report_20261020_134100/` (year first, so the folders sort by date). The newest 10 are kept (`REPORT_HISTORY`); older ones are deleted at the start of the next run. The other outputs below always hold the latest run. On CI the report goes straight into `reports/html/`, because every build already keeps its own.

```bash
npm run report                    # open the latest run's report
npm run report -- 20261020_134100 # open a specific run's report
```

| Output          | Path                                        | Use                                                                                                                                                    |
| --------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HTML report     | `reports/html/test_report_<date_time>/`     | Steps, errors, screenshots, videos, traces, defect evidence and API logs of that run                                                                   |
| JUnit XML       | `reports/junit/results.xml`                 | Jenkins / Azure DevOps / test-management import                                                                                                        |
| JSON            | `reports/json/results.json`                 | Custom dashboards; used for the GitHub job summary                                                                                                     |
| Artifacts       | `reports/test-results/`                     | Trace, screenshot and video, **kept only for failed tests**                                                                                            |
| Defect evidence | `reports/evidence/`                         | Screenshot + video of every **known-defect** test (API log for API-only ones), named `<defect>_<test case>_<browser>`: ready to attach to a bug ticket |
| API log         | `api-log.txt` attachment in the HTML report | Every API call a test made: method, URL, request, status, timing and response, with **passwords, auth tokens and cart cookies masked**                 |

**Searching the HTML report.** Words without `@` match anywhere in a test's title, file, browser or tags. A word starting with `@` is a tag filter and must be the **exact** tag name, in lower case: `@known-defect` works, `@defect-known`, `@known` or `@Known-Defect` finds nothing. Clicking a tag chip on any test applies its filter.

| Search                                      | Shows                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `CRT-025` · `cart` · `defect`               | Tests with that text in their title, file, browser or tags                   |
| `@known-defect`                             | All expected-to-fail tests for open defects                                  |
| `@pd-22`                                    | The tests for one defect (each known-defect test has its defect ID as a tag) |
| `@smoke` · `@api` · `@security` · `@mobile` | Tests of that type                                                           |
| `p:webkit` · `s:failed`                     | One browser/project · one status (passed, failed, flaky, skipped)            |
| `@known-defect p:firefox`                   | Combine filters: all must match                                              |

The same tags work on the command line, for example `npx playwright test --grep @pd-22` runs only the tests for PD-22.

To debug a CI failure, download the report artifact and run `npx playwright show-trace <trace.zip>` to replay the test step by step: DOM, network and console included.

**Why known defects need special handling:** a known-defect test fails _as expected_, so Playwright counts it as passed and would discard its failure screenshot and video under the "only on failure" settings. The `page` fixture (`src/fixtures/evidence.ts`) keeps them anyway, so every open defect always has fresh proof from the latest run.

The performance test loads the cart 3 times in fresh browser contexts (empty cache, like a first visit) and compares the **median** with the budget, so one slow request cannot fail it. It attaches `cart-page-metrics.json` (every sample's time to cart ready, DOMContentLoaded, load and transfer size) to the report on every run, so trends are visible even when the budget passes.

---

## 8. CI/CD

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
- No secrets are required (see [5.4](#54-test-data-isolation-one-account-per-worker)).

### Jenkins: `Jenkinsfile`

A declarative pipeline running in the official `mcr.microsoft.com/playwright` Docker image, so browsers and OS dependencies are pre-installed. It has a `SUITE` parameter (smoke / regression / perf), a nightly trigger, the same quality gate, JUnit results and the HTML report published on the build page.

---

## 9. Configuration

All settings have working defaults in `src/config/env.ts`, so **no `.env` file is needed** to run against DemoBlaze. To change something, create `.env` (copy `.env.example`); environment variables (for example in CI) override both.

| Variable                        | Default             | Purpose                                                            |
| ------------------------------- | ------------------- | ------------------------------------------------------------------ |
| `TEST_ENV`                      | `prod`              | Named environment from `src/config/env.ts`                         |
| `BASE_URL` / `API_URL`          | DemoBlaze URLs      | Override the environment's URLs                                    |
| `USER_STRATEGY`                 | `per-worker`        | `per-worker` (throwaway accounts) or `env` (use the account below) |
| `VALID_USER` / `VALID_PASSWORD` | —                   | Account for `USER_STRATEGY=env`                                    |
| `TIMEZONE`                      | `Asia/Kuala_Lumpur` | Browser timezone (used by the order-date check)                    |
| `CART_PAGE_BUDGET_MS`           | `3000`              | Performance budget for CRT-019 (median of 3 cold loads)            |
| `REPORT_HISTORY`                | `10`                | How many local HTML reports to keep (one per run)                  |
| `SKIP_HEALTH_CHECK`             | —                   | Set to `1` to start the run even if DemoBlaze looks down           |

**Health check before every run.** DemoBlaze is a shared public demo, and its API sometimes slows down or disappears for a few minutes (on 20-Oct-2026 its replies went from about 0.3 s to 8–12 s, then `api.demoblaze.com` stopped resolving). A run during such an outage fails dozens of tests for reasons that have nothing to do with the tests. So `global-setup.ts` first checks that the website and the API answer within 5 s (3 attempts each); if not, the run stops straight away with a message saying which one is down. An outage that starts in the middle of a run cannot be caught this way: if many tests suddenly time out on API calls, rerun once the site is back before treating them as defects.

Retries (1 on CI, 0 locally), timeouts and workers are set in `playwright.config.ts`. Retries are never used to hide a known problem: a rare Firefox start-up race ([microsoft/playwright#43413](https://github.com/microsoft/playwright/issues/43413)) is fixed at its source by opening and closing one warm-up window per Firefox worker (`browser` fixture in `src/fixtures/index.ts`).

---

## 10. Known defects

These are the 18 defects that have an expected-to-fail automated test, in ID order. The other 9 (PD-03, PD-04, PD-12, PD-13, PD-15 to PD-17, PD-20, PD-21) were found by manual testing and need manual or product-owner follow-up; all 27 are in the _Potential Defects_ sheet of the workbook. (PD-14, an item lost once after 'Product added.', was withdrawn: it never came back, manually or in CRT-010/011. Its ID is not reused.)

| Defect | Summary                                                                                                                                                                                                                                                            | Test             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| PD-01  | Order can be placed with an empty cart ("Amount: 0 USD")                                                                                                                                                                                                           | CRT-029          |
| PD-02  | Confirmation date shows the previous month (0-based month)                                                                                                                                                                                                         | CRT-027          |
| PD-05  | Spaces-only username and password are sent to the server instead of being blocked                                                                                                                                                                                  | LGN-011          |
| PD-06  | Guest alert text "Product added" lacks the full stop (annotated, not asserted)                                                                                                                                                                                     | CRT-007          |
| PD-07  | Password is sent Base64-encoded, which anyone can decode                                                                                                                                                                                                           | LGN-029          |
| PD-08  | Auth cookie `tokenp_` has no Secure/HttpOnly flags                                                                                                                                                                                                                 | LGN-027          |
| PD-09  | Items added as a guest are lost after logging in                                                                                                                                                                                                                   | CRT-023          |
| PD-10  | Pressing Enter in the password field does not log in                                                                                                                                                                                                               | LGN-020          |
| PD-11  | Login modal keeps typed values after Close                                                                                                                                                                                                                         | LGN-021          |
| PD-18  | Auth token is Base64 of username + number, so it is predictable                                                                                                                                                                                                    | LGN-026          |
| PD-19  | API returns HTTP 200 for errors (should be 401/404)                                                                                                                                                                                                                | LGN-034, CRT-048 |
| PD-22  | Guests who open a product page directly all share **one cart** (empty guest id). Found by the first automated run, which saw 121–134 other people's items                                                                                                          | CRT-049          |
| PD-23  | Double-clicking **Log in** sends two login requests                                                                                                                                                                                                                | LGN-019          |
| PD-24  | Double-clicking **Purchase** submits the order twice                                                                                                                                                                                                               | CRT-043          |
| PD-25  | **No lockout or rate limit:** 10 wrong passwords in a row are all answered with "Wrong password.", so passwords can be brute-forced                                                                                                                                | LGN-018          |
| PD-26  | Spaces around the username are not trimmed (requirement to confirm)                                                                                                                                                                                                | LGN-012          |
| PD-27  | Username is case-sensitive (requirement to confirm)                                                                                                                                                                                                                | LGN-013          |
| PD-28  | Pressing **OK** on the order confirmation before the site's cart-clear call finishes cancels that call: the bought items **stay in the cart**. Found when CRT-026 failed on Chromium and Firefox. The bug is in the site's code, so its test runs on Chromium only | CRT-050          |
