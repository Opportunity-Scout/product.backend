---
name: e2e-test
description: Use whenever adding, extending, or restructuring a Playwright e2e spec under tests/e2e/ in this repo — e.g. "write an e2e test for X", "add e2e coverage for endpoint Y", "cover this negative case", "add a positive/negative test to specs/...". Captures this project's established conventions (folder structure, Testomat.io linking, schema validation, cleanup patterns, naming, the golden-middle scoping rule) so they don't have to be re-derived from tests/e2e/CLAUDE.md on every request. Always consult before creating a new spec/testData file pair in tests/e2e/, even for what looks like a small, one-off addition.
---

# Writing a new e2e test in tests/e2e/

This captures the *how* for `tests/e2e/` in this repo. `tests/e2e/CLAUDE.md` is
the source of truth for the *why* behind each convention below — read the
relevant section there if something here seems arbitrary, or if you need the
historical reasoning to explain a choice to the user.

## 0. Before touching any files

One atomic scenario per spec file. If the user describes several scenarios,
confirm scope first — write one, get it reviewed/passing, then move to the
next, rather than batching several new spec files silently in one pass.

## 1. Decide what actually needs verifying (the golden-middle rule)

E2E is the most expensive, least isolated test tier in this project — it hits
the real deployed API, a real shared admin identity, real rate limits. Before
writing a test, ask: does this scenario prove something only visible in the
*deployed, running* system (the guard chain, real Postgres persistence,
use-case-level branching like "does this id exist")? If yes, it belongs here.

If it's pure `class-validator`/DTO boundary checking (`@Min`, `@Max`,
`@IsInt`...), **one representative case per endpoint is enough** — the rest
belongs in a root-project unit test on the DTO, not here. Concrete precedent:
`GET /users` originally had six separate boundary specs (one per
`limit`/`offset` validator), trimmed back down to one after review — see
`tests/e2e/CLAUDE.md` → "GET /users coverage" for the full reasoning.

## 2. Check whether the response has a schema

Before writing assertions, ask the `befirst-openapi-schema-reader` MCP
server's `get_response_schema` for the exact path/method/status under test.

- **Schema exists** → pull it in as-is (no hand-tightening, no invented
  constraints beyond what the live spec declares) into
  `schemas/<domain>/<Name>ResponseSchema.ts`, add it to that domain's
  `schemas/<domain>/index.ts` barrel, and validate via the `responseContract`
  fixture: `responseContract.validate(response, httpStatus.X, XSchema)`.
- **Errors "no application/json schema"** (true for essentially every
  non-2xx status, and for every `204` by definition) → don't invent one.
  Assert the status code directly:
  `expect(response.status(), '<message>').toBe(httpStatus.X)`.

## 3. Folder and file naming

```
specs/<domain>/<endpointMethod>/<scenario>.spec.ts
testData/<domain>/<endpointMethod>/<scenario>.ts   (only if step 5 says you need it)
```

Every endpoint gets its own subfolder from the moment its first spec is
written — no flat-folder-then-migrate-later phase, even if this is the only
scenario that endpoint has today. This was reversed once (endpoints started
flat, got a subfolder only once they grew past a handful of specs) and then
reversed again to "always nest" for consistency across domains — don't
reintroduce the flat phase.

- `<endpointMethod>` matches the method name on the relevant
  `api/<domain>/XApi.ts` client class exactly (`getUsers`,
  `setSearchProfileLimit`, `deleteUser`) — not the raw HTTP verb, not the
  server-side controller method name if it differs.
- `<scenario>` is camelCase, verb-first, describes the specific behavior
  under test, and does **not** repeat `<endpointMethod>` — the folder
  already says that. Good: `filtersByUsername`, `rejectsNonAdmin`,
  `setsLimitToZero`. Bad: `getUsersRejectsNonAdmin.spec.ts` inside a
  `getUsers/` folder.
- `test.describe(...)` text: `'<HTTP method> <path> → <short scenario>'`
  (e.g. `'PATCH /users/:id/search-profile-limit → negative limit'`) — a
  short lowercase phrase, distinct from the fuller, human-readable string
  passed to `test(...)`. This exists so Playwright/Testomat.io report lines
  aren't identical across every spec in the same endpoint folder.

## 4. Testomat.io first, before writing the spec

1. Find the suite matching the folder path — the suite tree mirrors
   `specs/` one level per folder (`product.backend` → `<domain>` →
   `<endpointMethod>`). Use `mcp__testomatio__suites_list`/`suites_get` to
   find an existing suite id, or `suites_create` if this endpoint doesn't
   have one yet (`file_type: "folder"` for a container that will hold
   sub-suites, `"file"` for a leaf that holds tests directly — a suite
   can't hold both at once, converting one to a folder requires moving its
   tests out first).
2. `mcp__testomatio__tests_create` with a `title` matching the test name, the
   `suite_id`, and a `description` that's a numbered, step-by-step account
   of what the test actually does (look at any existing test's description
   in the suite for the exact style) plus a cleanup note at the end.
3. Take the returned `id` and use it as `{ tag: '@T<id>' }` on the `test(...)`
   call.

Never leave a spec untagged. Never leave an orphaned Testomat.io test case
behind after deleting or substantially rewriting a spec — delete it via
`tests_delete` in the same pass, don't let it silently drift out of sync.

## 5. Does this scenario need a real user (testData) and cleanup?

Three shapes — pick the one that matches:

**a) No real user needed.** The target doesn't need to exist for the
assertion to hold — a DTO-validation `400` case, or a "genuinely nonexistent
id" `404` case. Use `randomUUID()` inline in the spec body. No `testData`
file, no `afterAll`.

**b) One real user, and the test's own action removes it.** A self-delete or
admin-delete positive test. No `afterAll` — the delete under test *is* the
cleanup (adding a second delete call after a successful one would just
assert the same thing twice, and would itself now correctly 404). `testData`
is still needed for the login payload.

**c) One or more real users that survive the test.** Everything else — the
user needs to keep existing for an assertion, or the tested action is
expected to *fail* so nothing gets removed automatically (e.g. a
non-owner-delete-attempt test needs both a "victim" and an "attacker" user,
neither of which the failed delete call touches). Add a
`test.afterAll(({ backendApi }) => backendApi.users.deleteUser(token, id))`
per created user, using each user's own token — self-delete needs no admin
rights.

When testData is needed:

```ts
import { randomUUID } from 'crypto';
import { TelegramLoginFields } from '../../../api/auth/interfaces';

const newUserLoginPayload: TelegramLoginFields = {
  id: randomUUID(),
  auth_date: Math.floor(Date.now() / 1000),
  username: `e2e_<context>_${Date.now()}`,
};

export default { newUserLoginPayload /* , ...other named values the test needs */ };
```

`<context>` is a short slug for what the spec covers (`login`,
`get_users`, `set_limit_random`...) — the `e2e_` prefix is how synthetic
rows stay greppable/prunable in the real production database this suite
runs against; don't drop it or invent a different prefix. Any other fixed
value a test needs (an expected count, a fixed limit) goes in the same
`testData` file as a named export, not inline as a magic literal in the
spec body.

## 6. Getting a user's id

Prefer decoding it from their own JWT over a second lookup call:
`jwtHelper.decode(loginResponseBody.token).sub` — the `sub` claim already
**is** `User.id` (verified elsewhere by `jwtHelper.expectTokenIsValid`).
Don't call `GET /users?telegramUsername=` just to look up an id you can
already derive locally.

## 7. Assertions

- Every `expect()` gets a descriptive message as its second argument — no
  bare `expect(x).toBe(y)`.
- `expect(actual, message).toBe(expected)` — the value your code under test
  produced goes first, the value you expected goes second; this is what
  keeps a failure's "Expected/Received" output meaningful.
- All `const`/`let` declarations go before all `expect()` calls in a test
  body — never interleave. The one exception: when the code under test
  makes it genuinely unsafe to bind a value before asserting (e.g. an array
  `.find()` result that might be `undefined`) — inline the repeated access
  there instead of naming an intermediate variable that could crash.
- If the endpoint under test writes something, verify it actually
  persisted with a follow-up read, rather than trusting the mutating
  endpoint's own response body alone — see any `setSearchProfileLimit` or
  `deleteUser` positive spec for the pattern.

## 8. Imports

- Schemas: `import { XSchema } from '../../../schemas/<domain>'` (the
  barrel), never the individual file path.
- Interfaces: `import { X, Y } from '../../../api/<domain>/interfaces'`
  (the barrel) — combine everything imported from one module into a single
  import statement, don't split it across two lines.
- Path depth: count folder levels from the spec file to `tests/e2e/` root.
  At the standard `specs/<domain>/<endpointMethod>/<file>.spec.ts` depth,
  that's `../../../` to everything at the `tests/e2e/` root
  (`fixtures/`, `constants/`, `helpers/`, `api/`, `schemas/`, `testData/`).

## 9. Before calling it done

Run, in this order, from `tests/e2e/`:

```bash
npx eslint <changed files>
npm run typecheck
npm test -- <path to your new spec>
```

Only run the *whole* `specs/` suite sparingly. The shared e2e admin identity
has a real production rate limit (`perAccount`, 5 req/min on `POST
/auth/telegram`) — repeatedly rerunning `npm test` in one session can
exhaust it and produce unrelated `429`s (and a follow-on stale-`auth_date`
`401`, since `testData` computes `auth_date` at module-load time, not
request-send time — see ClickUp 869et91gr) on *other*, already-passing
specs. That's the known issue, not a regression in what you just wrote —
don't chase it by rewriting unrelated files; just wait a minute and rerun.

Then add a short bullet to the relevant `## <Endpoint> coverage` section in
`tests/e2e/CLAUDE.md` — only what's non-obvious from reading the spec file
itself (a naming/scoping decision, why a case was included or deliberately
left out), not a restatement of the assertions the file already makes
readable through its own `expect(..., message)` calls. If no such section
exists yet for this endpoint, this is the first spec for it — create one,
following the shape of an existing one.

## 10. Never do these

- Don't add exhaustive `class-validator` boundary permutations at this tier
  (see step 1) — one representative case per endpoint.
- Don't construct a request URL or sign a payload directly in a spec — go
  through the `api/<domain>/XApi.ts` client class; add a method there if
  one doesn't exist yet.
- Don't invent a hand-written JSON Schema — always pull it from the live
  spec via `mcp-openapi-server`, or skip schema validation entirely (plain
  status-code assertion) if the live spec doesn't declare one.
- Don't `git add`/commit unless the user explicitly asks.
