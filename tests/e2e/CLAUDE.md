# E2E tests — BeFirst Product Backend

## What this is

End-to-end tests for the deployed API, run with Playwright against the real
production environment — no staging (see root `CLAUDE.md` → "Roadmap" step 4
for why: a second VPS would be a second recurring cost, and "a red e2e run
means the bug is already live" is accepted practice here, not a compromise).

This is a **deliberately separate npm project** from the root NestJS app —
its own `package.json`, its own `node_modules`, its own `tsconfig.json`. Not
a `tests/e2e/` folder that happens to share the root project's dependency
tree. The conventions in this file are scoped to this sub-project and are
allowed to diverge from the root `CLAUDE.md` where it makes sense — they're
two different kinds of codebase (a NestJS app vs. a Playwright test suite)
sharing a git repo, not one project with two test tiers.

## Stack

Playwright (`@playwright/test`), TypeScript, Node 22 — versions pinned in
`package.json` are checked against the live npm registry at the time they're
added (`npm view <pkg> version`), not assumed from memory, same reasoning as
the root project's "docs/training data lag reality" principle.

Environment variables (`BASE_URL`, `TELEGRAM_BOT_TOKEN`,
`ADMIN_TELEGRAM_USER_ID`) load via Node's native `--env-file-if-exists`
flag (`npm test` → `node --env-file-if-exists=.env ...`), not the
`dotenv` package — mirrors the root project's own reasoning (see root
`CLAUDE.md` → "Environment variables"): no dependency needed for a
handful of env vars, and Node already does this natively.
**`--env-file-if-exists`, not `--env-file`** (switched 2026-08-28, CI):
plain `--env-file` throws (`node: .env: not found`, exit code 9) if the
file is missing — fine locally where `.env` always exists, but CI has no
`.env` file at all, injecting these same variables directly as real
process env vars via the GitHub Actions `secrets` context instead. The
`-if-exists` variant loads the file when present and is a silent no-op
when it isn't, so the exact same `npm test` command works in both
places without branching on `process.env.CI`.

`tests/e2e/.gitignore` (added 2026-08-17) covers what the root
`.gitignore`'s blanket `node_modules/`/`dist/`/`.env` rules don't reach:
Playwright's own run artifacts (`test-results/`, `playwright-report/`,
`blob-report/`, `playwright/.cache/`) — the root patterns are unanchored
and already match these subdirectories at any depth for
`node_modules`/`dist`/`.env` specifically, but Playwright's report/cache
folders needed their own entry since nothing upstream already covered
them.

## Structure

```
tests/e2e/
  api/                 API client classes, one per backend endpoint-group —
                        raw HTTP wrappers only, no validation, no opinions
                        about why a call is being made
    BackendApi.ts        facade aggregating every domain API (.auth, .users, ...)
    auth/
      AuthApi.ts          wraps POST /auth/telegram — one method, login(fields)
      interfaces/           TelegramLoginFields, TelegramLoginPayload
    users/
      UsersApi.ts          wraps GET /users (admin-only) and DELETE /users/:id
      interfaces/           ListUsersParams, User, GetUsersListResponse
  helpers/             Test-oriented utilities — stateless singletons by
                        default (see "Helpers" below for the one exception)
    commonHelper.ts       e.g. Telegram Login Widget HMAC signing
    responseContractHelper.ts    AJV-based ResponseContract.validate(response, status, schema)
    jwtHelper.ts          JwtHelper.expectTokenIsValid(token) — decode-only JWT claim checks
    apiHelper.ts          ApiHelper.getAdminAccessToken() — the one stateful
                           exception; see "E2E admin identity"
    interfaces/
  fixtures/            Playwright fixture wiring
    test.ts               the one base.extend() point; every spec imports test/expect from here
    interfaces/            Fixtures (test-scoped), WorkerFixtures (worker-scoped)
  constants/           No magic strings/numbers
    index.ts               barrel — re-exports routes.ts/httpStatus.ts and hosts
                            one-off values directly (e.g. BASE_URL) rather than
                            giving every single constant its own file. A second,
                            deliberate exception to "no barrels" (the first is
                            interfaces/ folders) — see below.
    routes.ts             API paths, grouped by domain — mirrors api/'s structure
    httpStatus.ts          HTTP status codes actually asserted on (grows as tests need more, not pre-filled)
  testData/            Input payloads for specs, one subfolder per
                        endpoint-group, mirrors api/ (still taking shape —
                        first occupant is testData/auth/login.ts)
  specs/               Playwright's testDir — one subfolder per endpoint-group, mirrors api/
    auth/
      login.spec.ts
  schemas/             JSON Schemas per endpoint response, for AJV-based
                        response validation — pulled from the live Swagger/OpenAPI
                        spec via mcp-openapi-server (below), not hand-duplicated
                        from memory. One subfolder per endpoint-group, mirrors api/.
    auth/
      LoginResponseSchema.ts
    users/
      ListUsersResponseSchema.ts
  mcp-openapi-server/  A separate, third npm project (own package.json, own
                        node_modules) — a minimal read-only MCP server used only
                        as an authoring tool for schemas/, not part of the
                        Playwright run itself.
```

**API client classes** (`api/`) are the only thing specs talk to — a spec
never constructs a request URL or signs a payload itself, it calls
`backendApi.auth.login(fields)` and asserts on the result. Each class
takes Playwright's `APIRequestContext` (plus whatever config it needs, e.g.
`AuthApi`'s `botToken`) via constructor injection, wired up once in
`fixtures/test.ts` and exposed to every spec as the `backendApi` fixture.

**Helpers** (`helpers/`) are stateless — pure functions with no I/O, no
async setup/teardown. They're plain singleton-instance exports
(`export const commonHelper = new CommonHelper()`). Same reasoning as the
root project's `prismaSearchProfileMapper` singleton-instance pattern (see
root `CLAUDE.md` → "Persistence").

**Whether a helper is wired through a fixture depends on who calls it, not
on whether it's stateless** (revised 2026-08-17, prompted by review):
`commonHelper` is only ever called from inside `AuthApi.login`, never from
a spec directly, so it's a plain import — routing it through a fixture
would add a layer no spec ever touches. `responseContract` (see below) is
the opposite: specs call it directly, the same way they call `backendApi`,
so it's exposed the same way — as a `responseContract` fixture,
destructured alongside `backendApi` — giving spec authors one consistent
surface ("everything a test body touches comes from the fixture args")
instead of a mix of fixture-for-some, import-for-others depending on
internal implementation details. The underlying export is still the same
stateless singleton instance either way; the fixture just re-exposes it
(`async ({}, use) => use(responseContract)`). It isn't re-instantiated per
test.

**`ApiHelper` (`helpers/apiHelper.ts`) is a deliberate exception to
"helpers are stateless singletons"** (added 2026-08-18, see "E2E admin
identity" below): it's a real class with constructor state (`AuthApi`,
`adminTelegramUserId`), constructed via the `apiHelper` fixture (worker-
scoped since 2026-08-28 — one instance per worker, not one per test; see
"Test data & cleanup" for why), not a `export const x = new X()`
singleton. It earns the exception because its job — composing a raw
`AuthApi` call into "give me a ready-to-use admin token" — genuinely needs
constructor wiring (which `AuthApi` instance, which admin id) the way
`commonHelper`/`jwtHelper` never do. Named `helpers/` rather than `api/`
anyway, on purpose: it calls `AuthApi.login()` (the one real `api/`-layer
method) and layers test-oriented convenience on top (build the
admin-specific fields, throw a plain error on a bad status, cache the
token) — `api/` classes stay raw
HTTP wrappers with zero opinions about *why* a call is being made.

**`{}`, not `_`, for a dependency-less fixture's first argument** (fixed
2026-08-17, caught by an actual test run failing) — `_` was tried first to
satisfy `no-empty-pattern` (part of the root project's own ESLint setup,
which also lints `tests/**/*.ts` via `.lintstagedrc.json`, and rejects an
empty object-destructuring pattern outright), but it breaks Playwright
itself: Playwright parses a fixture function's own source to determine its
dependencies, and requires a literal object-destructuring first argument
even when there are none — any other parameter name (`_` included) fails
at runtime with "First argument must use the object destructuring
pattern". The lint rule loses to Playwright's runtime requirement here —
`{}` stays, with a targeted `// eslint-disable-next-line no-empty-pattern`
on that one fixture.

**Interfaces** live in a sibling `interfaces/` folder next to whatever uses
them (`helpers/interfaces/`, `fixtures/interfaces/`, `api/*/interfaces/`) —
same "logic here, contracts there" separation the root project applies,
decided independently for this sub-project rather than assumed. Unlike the
root project (which deliberately avoids barrel files outside one narrow
exception), every `interfaces/` folder here gets an `index.ts` barrel —
decided for this project specifically, for import convenience, not
inherited from root.

**Constants** (`constants/`) hold anything that would otherwise be a magic
string or number repeated across specs/API classes: route paths
(`routes.ts`, grouped by domain, mirroring `api/`'s own structure) and HTTP
status codes (`httpStatus.ts`) actually asserted on somewhere — not a
speculative full list of every possible status up front. **Also has an
`index.ts` barrel** (added 2026-08-28) — a second, deliberate exception to
"no barrels outside `interfaces/`": re-exports `routes.ts`/`httpStatus.ts`,
and hosts genuinely one-off values (`BASE_URL`) directly in the barrel
itself rather than giving a single primitive its own file. Every consumer
now imports from `../../constants`, not individual files.

**Response schema validation** (`schemas/`, implemented 2026-08-17): AJV
validates each response body against a JSON Schema, asserted through the
`responseContract` fixture's `validate(response, status, schema)` (3
positional arguments, not an options object — decided in review, reads
better at the call site:
`responseContract.validate(response, httpStatus.OK, LoginResponseSchema)`)
— catches contract drift (extra/missing/renamed fields) that field-by-field
`expect()` checks can miss, and earns its keep specifically on multi-field
responses (e.g. `SearchProfile`), not single-field ones like `{ token }`
(the first schema, `schemas/auth/LoginResponseSchema.ts`, is exactly that
trivial case — used to establish the pattern, not because it needed schema
validation on its own merits). Both the helper file and the method went
through several rounds of review before landing here:
`responseAssertionsHelper.ts`'s `ResponseAssertions.expectResponseMatches`
→ `expectResponseMatchesContract` (name what it actually checks: status
code **and** contract/schema compliance) → finally
`responseContractHelper.ts`'s `ResponseContract.validate` once the method
started also *returning* the parsed, typed body (see next paragraph) — at
that point "expect..." undersold what it does, and the file/class needed
to stop being framed as pure "assertions".

**`validate` returns the parsed, already-validated body, typed from the
schema itself** (`Promise<FromSchema<S>>` via the `json-schema-to-ts`
package, `S` inferred from whichever schema object is passed in) — no
hand-written response interface, no `as` cast at the call site, and the
body is parsed exactly once instead of once inside the helper and again in
the spec. This is deliberate, not just a convenience: there is no way to
get the typed body without going through schema validation first, so a
test can't accidentally read a field the contract never checked. Writing
`Promise<FromSchema<S>>` directly as the return type hits TypeScript's
"type instantiation is excessively deep" limit once `S` is an open generic
rather than a concrete literal — worked around the same way
`json-schema-to-ts`'s own README documents for exactly this shape (a
generic validator function): a second, defaulted generic parameter
(`T = FromSchema<S>`) referenced in the return position instead of writing
`FromSchema<S>` inline. Passing the schema into Ajv's own `compile()`
needs a similar cast (`schema as Schema`, Ajv's own type) for the same
underlying reason — letting TS infer Ajv's own generic from
`json-schema-to-ts`'s conditional type blows up the same way.

Schemas live under `schemas/`, one subfolder per endpoint-group (mirrors
`api/`), one file per endpoint response, **pulled from the live spec via
`mcp-openapi-server`'s `get_response_schema` tool** and pasted in as-is —
not hand-duplicated from the root project's DTOs, and not hand-tightened
either (e.g. `token` has no `minLength` because the live spec doesn't
declare one; a business-rule check like "non-empty" belongs in the spec
test itself, alongside the schema check, not smuggled into the schema).
One exception, applied at the source rather than by hand per file:
`get_response_schema` automatically sets `additionalProperties: false` on
every object node the live spec doesn't already constrain (see
`withStrictObjects` in `mcp-openapi-server/src/index.ts`) — the live spec
itself doesn't declare this (NestJS Swagger doesn't emit it by default),
so without this the schema would silently accept a response that gained an
undocumented extra field. Doing it once in the tool, not per schema file,
means every future schema pulled this way is strict by default without
needing to remember to hand-add it.

**`validate` also carries a custom, descriptive assertion message**
(decided 2026-08-17) — not the default Playwright/AJV failure output: on a
schema mismatch it lists each AJV error's `instancePath` + message, not
just a boolean. Applies to future custom assertions in this project
generally, not only this one helper.

**`jwtHelper.ts`** (added 2026-08-17): `JwtHelper.expectTokenIsValid(token)`
decodes the bearer token `POST /auth/telegram` returns and asserts its
claims are sane — `sub` is a UUID v4 (the `User.id` shape, generated via
Node's `randomUUID()` server-side, not the caller-supplied
`telegramUserId`), `exp` is after `iat`, and `exp` hasn't already passed.
**Decode-only, deliberately** — no `jsonwebtoken` or similar dependency,
and no cryptographic signature verification: that would need the server's
`JWT_SECRET`, a private signing secret with a different trust boundary
than `TELEGRAM_BOT_TOKEN` (which the e2e suite legitimately holds, since
it plays the role of the Telegram Login Widget). This project has no
business holding the server's own signing secret, and an external API
consumer never verifies a bearer token's signature either — only the
server that issued it does. Decoding the token itself needs nothing beyond
Node's native `Buffer.from(part, 'base64url')`, so no dependency for that
part — consistent with this project's general bias against a dependency
for something a few lines of native code already covers (env vars,
`--env-file`; see also the root project's own reasoning, `CLAUDE.md` →
"Environment variables"). The `sub` **shape** check, though, does use the
`uuid` package (`validate`/`version`) — decided in review: a hand-rolled
UUID regex is exactly the kind of thing that's easy to get subtly wrong
(version/variant nibbles), and a well-maintained, single-purpose library
is the cleaner call here, unlike the token-decoding itself which is
genuinely trivial. `uuid` (v9+) ships ESM-only, while this whole
sub-project is CommonJS — a static `import ... from 'uuid'` doesn't
compile, so it's loaded via a dynamic `import('uuid')` inside the method
instead (Node's own documented way for a CJS module to consume an
ESM-only package), which is why `expectTokenIsValid` is `async` despite
doing no I/O of its own. `decode` stays a private method; only
`expectTokenIsValid` (which calls it) is exposed, since nothing currently
needs the bare claims outside an assertion. Named `expectTokenIsValid`,
not `validate`, because — unlike `ResponseContract.validate` — nothing
downstream consumes the decoded claims, so there's no "returns typed data"
naming tension to avoid; a plain void assertion is exactly what it is.

**`mcp-openapi-server/`** (decided 2026-08-17): a small, hand-written,
read-only MCP server (official `@modelcontextprotocol/sdk`), not a
third-party generator — considered `openapi-mcp-generator` (produces a full
MCP server that can also *call* the live API, not just read its spec) and
rejected it for exactly that reason: more surface than this needs, and
unreviewed generated code standing between an agent and the production API.
Exposes exactly two tools, both read-only against the live
`/product-backend-api/swagger-json`:
- `list_operations` — every path + method + operationId + summary in the spec.
- `get_response_schema` — the fully `$ref`-dereferenced JSON Schema for one
  response of one operation, given path + method + status. Also normalizes
  two OpenAPI-vs-JSON-Schema mismatches before returning: `nullable: true`
  becomes `type: [X, 'null']` when the node has a flat `type` string, or
  `{ anyOf: [<node>, { type: 'null' }] }` when it doesn't (`oneOf`/`allOf`/a
  `$ref` resolved into something composite — caught in review, the flat-type
  case alone silently dropped `nullable` on anything else) — Ajv doesn't
  understand OpenAPI's `nullable` keyword at all, it would silently ignore
  it and reject a real `null`, e.g. `User.telegramUsername`. Every object
  node also gets `additionalProperties: false` unless already set (see
  below).

It cannot call the deployed API — it only fetches and parses the published
spec document. Registered as a project-scoped MCP server in `.mcp.json` at
the repo root (`node tests/e2e/mcp-openapi-server/dist/index.js`). **`dist/`
is gitignored** (inherits the repo's blanket `dist/` rule) — after cloning,
or whenever `src/index.ts` changes, run `npm install && npm run build`
inside `mcp-openapi-server/` before the MCP server will start; Claude Code
needs a restart (or `/mcp` to check connection status) to pick up a new or
rebuilt server.

**Config, not hardcoded values** (revised 2026-08-17, review): the spec URL
(`OPENAPI_URL`) is read from `process.env` with **no in-code fallback** —
an unset value throws at startup instead of silently defaulting to
`https://befirstapp.com/...`. Set via `.mcp.json`'s own `env` field for
this server, not a `.env` file: it isn't a secret, and `.mcp.json` is
already the one config surface this server's actual caller (Claude Code)
reads — a second, redundant config mechanism (`.env` + `--env-file`) would
just be more places to look for the same one value. The `McpServer`'s
`version` is read from `mcp-openapi-server/package.json` at startup
(`fileURLToPath(new URL('../package.json', import.meta.url))` +
`JSON.parse`) instead of a hand-typed literal, so it can't drift from the
package's actual version the way a duplicated string could. Its `name`
(`befirst-openapi-schema-reader`) stays a literal, deliberately not tied to
`package.json`'s `name` — the MCP identifier and the npm package name are
different concerns that happen to currently look similar; forcing one to
derive from the other would be coincidental coupling, not a real
dependency.

**Own `package.json`/`tsconfig.json`, not folded into `tests/e2e`'s**
(revisited 2026-08-17, review question: "do we need a fully separate one?")
— kept separate. The concrete reason isn't just "feels like a different
tool": `mcp-openapi-server` runs as ESM (`"type": "module"`, needed for the
top-level `await server.connect(transport)` the MCP SDK's own examples use)
while `tests/e2e` itself is CommonJS — merging the two `package.json`s
would force picking one module system for both, either giving up the clean
top-level `await` here or reworking Playwright's own CJS setup for no
Playwright-side benefit. `tsconfig.json` differs for the same underlying
reason (`module`/`moduleResolution: "nodenext"` here vs. `"node16"` in
`tests/e2e/tsconfig.json`) and stays separate for as long as the module
systems do. Cost of staying separate is genuinely small (one extra
`npm install` after cloning, ~2 real dependencies) against the win of not
reconciling two different module systems for a tool that's conceptually
a different consumer (Claude, authoring `schemas/`) from the Playwright
suite anyway.

Verified live end-to-end (2026-08-17) against the real deployed spec before
being treated as trustworthy: `list_operations` returned real operations,
and `get_response_schema` correctly surfaced that `POST /auth/telegram`'s
`200` response currently has **no** `application/json` schema in the spec at
all — `AuthController`'s `@ApiOkResponse({ description: '...' })` has no
`type:` pointing at a response DTO, so NestJS Swagger never generated one.
Not a bug in the reader; a real, separate gap on the root project's side
(root `CLAUDE.md`'s "every field needs `@ApiProperty()`" rule is stated for
request DTOs — response DTOs haven't been held to the same standard yet).
Revisit before authoring `schemas/auth/LoginResponseSchema.ts`: either add a
proper response DTO to `AuthController`, or accept validating a looser
shape for that one endpoint until it does.

## Test data & cleanup

Every test run creates real rows in the real production database (a `User`
via login, possibly `SearchProfile`s later) — same reasoning as root
`CLAUDE.md` → Roadmap step 4: no way to reach the VPS's Postgres directly
from CI, so cleanup has to go through the real API (`DELETE /users/:id`),
not a second `PrismaClient` connection the way integration tests do it.

**Cleanup wired up (2026-08-27, revised 2026-08-28), closing the gap open
since 2026-08-17.** `UsersApi.delete(accessToken, userId)` wraps `DELETE
/users/:id` (self-service — each created user deletes itself, no admin
token needed for this). `specs/auth/login.spec.ts` tracks the one user it
creates via two `describe`-scoped `let` variables (`loginResponseBody`,
`user`), assigned inside the test body, and a single `test.afterAll`
reads them back to call `delete(loginResponseBody.token, user.id)` —
`user.id` comes from the admin-search response body, not a decoded JWT,
since it's already fetched for the assertions anyway.

**Two `let`s, not a tracking array** — an earlier draft of this pushed
`{ token, userId }` pairs onto a module-level `createdUsers` array (with
its own `CreatedUser` interface in `api/users/interfaces/`) so `afterAll`
could loop and delete every entry, sized for "however many users this
file's tests create." Simplified once it was clear this file has exactly
one test creating exactly one user, so the array was solving a problem
that doesn't exist yet — the `CreatedUser` interface doesn't exist in the
codebase currently either. Reintroduce both, if a second test in this
`describe` starts creating its own user too — not before.

**Deliberately `afterAll`, not `afterEach`** — batches cleanup into one
pass regardless of how many tests in the file create a user, rather than
tearing down after every individual test.

**`afterAll` takes `{ backendApi }` directly, like any test** (revised
2026-08-28, review) — first attempt had `afterAll` construct its own
`APIRequestContext` by hand via the standalone `request.newContext(...)`
export, since Playwright's *test-scoped* fixtures (the built-in `request`
included) aren't available inside `beforeAll`/`afterAll`. That worked but
read as ad hoc — real problem was that `backendApi` (and `apiHelper`,
which depends on it) had no reason to be test-scoped in the first place:
`BackendApi`/`AuthApi`/`UsersApi` are fully stateless HTTP wrappers, so
nothing is lost sharing one instance across every test in a worker. Made
`backendApi` genuinely `{ scope: 'worker' }` instead, backed by its own
`APIRequestContext` from the worker-scoped `playwright` fixture
(`playwright.request.newContext({ baseURL: BASE_URL })`, disposed after
`use()`) rather than the test-scoped `request` fixture — worker-scoped
fixtures can depend on other worker-scoped fixtures, just not test-scoped
ones. `apiHelper` followed `backendApi` into worker scope for the same
reason. This means `Fixtures` (test-scoped: just `responseContract` now)
and `WorkerFixtures` (`backendApi`, `apiHelper`) are two separate
interfaces, both passed to `base.extend<Fixtures, WorkerFixtures>(...)`.
The payoff: `afterAll` now reads exactly like a normal test body —
`test.afterAll(async ({ backendApi }) => { ... })` — no special-cased
context construction left in the spec at all.

This pattern (`describe`-scoped tracking variables + `afterAll` teardown)
is specific to this one spec file for now — extract it into a shared
helper once a second spec needs the same shape, not before.

## E2E admin identity (added 2026-08-18, revised 2026-08-19)

Verifying that `POST /auth/telegram` actually persists a `User` row needs
reading it back through the API — `GET /users?telegramUsername=...` is the only way
(no direct Postgres access from CI, see above) — but that endpoint is
admin-only (`AdminGuard` on top of `JwtAuthGuard`, see root `CLAUDE.md` →
"Admin access to Search Profiles and Users"), and a freshly-created `User`
always gets the default `role: 'user'`. So the suite needs its own,
separate identity that's actually an admin.

- **One fixed `telegramUserId`**, not a fresh random one per run — read
  from `ADMIN_TELEGRAM_USER_ID` (`.env`/`.env.example`). Logging in
  with the same `id` every run finds and reuses the same `User` row
  (`LoginWithTelegramUseCase`: `existingUser ? update : create`), which is
  exactly what's needed here — an admin identity that persists across
  runs, not a fresh one that would need re-promoting to admin every time.
- **Bootstrapping the row itself is manual**, the same way the root
  project already documents for the *first* admin in general (root
  `CLAUDE.md` → "Bootstrapping the first admin is deliberately not a built
  endpoint"): log in once with the chosen `telegramUserId` (creates an
  ordinary `role: 'user'` row), then hand-promote that one row to
  `role: 'admin'` via Prisma Studio or a direct `UPDATE`. A one-time, manual
  step — not something the suite or CI does itself.
- **`AuthApi` stays a pure API client** (revised 2026-08-19, review) — it
  has exactly one method, `login(fields: TelegramLoginFields)`, a raw
  wrapper around signing + POSTing to `POST /auth/telegram`. It has no
  opinion on *who* is logging in — no `loginAsAdmin`, no
  `loginWithTelegram` convenience method, no `adminTelegramUserId` in its
  constructor (which is back down to `request` + `botToken`, matching
  `BackendApi`'s constructor). Building the admin-specific fields (fixed
  `id`, `auth_date`, a fixed `username`) is `ApiHelper`'s job, not
  `AuthApi`'s — see `helpers/apiHelper.ts` and the "Helpers" section above
  for why that split, and why `ApiHelper` is a stateful exception to the
  usual singleton-helper shape.
- **`ApiHelper.getAdminAccessToken()`** builds the admin fields, calls
  `auth.login(...)`, and throws a plain `Error` on a non-`200` status —
  deliberately *not* `responseContract.validate(...)`: decided in review
  that schema-validating the login response isn't this method's job (the
  regular login path already exercises that same response shape), and
  layering it in here would blur `ApiHelper` back toward being a spec.
  Caches the resolved token in a private instance field. This was
  originally a module-level variable (reasoning: a fresh `ApiHelper` used
  to be constructed per test, but the module itself only loads once per
  worker) — revised 2026-08-28 once `apiHelper` became a worker-scoped
  fixture for an unrelated reason (see "Test data & cleanup" →
  `afterAll`), which means there's now genuinely only one `ApiHelper`
  instance per worker, and an instance field does the same job as the
  module-level `let` more directly. Still caps admin logins at one per
  worker rather than one per test, keeping clear of the `perAccount` rate
  limit (5 req/min per `telegramUserId`, root `CLAUDE.md`) as more
  admin-scoped tests get added.
- **`api/users/UsersApi.ts`** — wraps `GET /users`
  (`list(accessToken, params?: ListUsersParams)`, bearer auth via header)
  and `DELETE /users/:id` (`delete(accessToken, userId)`, added 2026-08-27
  for cleanup — see "Test data & cleanup" above).
  `ListUsersParams` (`api/users/interfaces/`) mirrors the live query params
  (`telegramUsername`, `limit`, `offset`) — named to match the server's
  actual `ListUsersQueryDto` field, not renamed on the client side.
  `telegramUsername` was originally `search` on both the server and this
  client — renamed together 2026-08-23 (see root `CLAUDE.md` → "Admin
  access to Search Profiles and Users") once review caught that a generic
  "search" name didn't say what it actually filters on.
  `list()` builds a `URLSearchParams` from whichever params are actually
  set, skipping `undefined` — chosen over widening `ListUsersParams` with
  an index signature (would silently accept unrelated extra keys) or
  casting at the call site (doesn't explain anything, just suppresses the
  check) to satisfy Playwright's indexed `params` type. `BackendApi`
  exposes it as `.users`, same facade pattern as `.auth`.
- Not treated as a generic "admin API client for testing admin features"
  — scoped to what this one persistence check needs. Extend it if/when a
  real admin-focused e2e test is written.

## CI: running against a live deploy (added 2026-08-28)

`.github/workflows/e2e-tests.yml` runs this suite automatically after a
successful deploy — `workflow_run`, watching the root project's `Deploy`
workflow (`.github/workflows/deploy.yml`, root `CLAUDE.md` → "Deploy
trigger stays manual"), gated on `github.event.workflow_run.conclusion
== 'success'`. Deliberately a separate workflow file from `Deploy`
itself, not a step tacked onto it — different concerns (deploying vs.
verifying) and different failure semantics (an e2e failure shouldn't
read as a failed deploy in the Actions UI).

**Also has `workflow_dispatch`** (added 2026-08-28, revised same day) —
a standing, permanent capability to run the suite on demand from the
Actions UI, not tacked on just to verify the pipeline once. First cut
had only `workflow_run`, reasoning that a standalone run "only makes
sense after a real deploy" — revised once it became clear a manual
"run it right now" button is genuinely useful on its own (checking the
suite still passes without waiting for the next deploy, debugging a
flaky run, etc.), independent of whatever triggered it. The job's `if:`
has to account for both trigger shapes — `github.event.workflow_run`
only exists on a `workflow_run` event, so it's
`github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success'`,
not just the success check alone (which would silently skip the job
entirely on a manual run, since `github.event.workflow_run` would be
undefined there).

Steps: `actions/checkout@v4`, `actions/setup-node@v4` (Node 22, npm cache
keyed off `tests/e2e/package-lock.json` specifically — a different lockfile
than the root project's), `npm ci` and `npm test` both run with
`working-directory: tests/e2e` (this is its own npm project, not something
`npm ci` at the repo root would touch).

**Secrets** (GitHub repo Settings → Secrets and variables → Actions):
`TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_USER_ID` — same values as
`tests/e2e/.env` locally, injected as real process env vars via the step's
`env:` block. No secret named `BASE_URL` — the `constants/index.ts`
default (`https://befirstapp.com`) is already correct for where this
actually needs to point, so there's nothing to override.

**Testomat.io reporting (added 2026-08-28).** `@testomatio/reporter`
(`^2.14.0`), configured in `playwright.config.ts`: `reporter` is `'list'`
as before when `TESTOMATIO` isn't set (plain local runs), or `[['list'],
['@testomatio/reporter/playwright', { apiKey: process.env.TESTOMATIO }]]`
when it is — so the exact same `npm test` command works locally
(no reporting, nothing to configure) and in CI (reports automatically,
since the `TESTOMATIO` secret is only present there). The `list` reporter
stays alongside it deliberately, not replaced — still want readable
console output for a run watched live, Testomat.io is an addition, not a
swap. Secret name matches the env var the library itself reads
(`TESTOMATIO`), so no remapping needed in the workflow.

**Known, accepted risk:** `@testomatio/reporter` unconditionally depends
on `@cucumber/cucumber` (a hard dependency, not optional/peer) even though
only the Playwright adapter (`@testomatio/reporter/playwright`) is ever
used — `npm audit` flags real vulnerabilities inside that unused Cucumber
dependency chain (`tmp` ≤0.2.5, high; `uuid` <11.1.1, moderate). Accepted
2026-08-28: the vulnerable code path is never reached by anything this
project's code calls (no Cucumber usage anywhere), and the only "fix" npm
offers is downgrading to a ~2-years-old pre-1.0 release, not a real
option. Revisit if `@testomatio/reporter` ever splits Cucumber support
into an optional dependency, or if a lighter integration (Testomat.io's
REST API directly, fed by Playwright's own `json` reporter — considered
and rejected here in favor of the officially maintained package) becomes
worth revisiting.
