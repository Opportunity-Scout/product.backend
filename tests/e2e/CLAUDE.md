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

**Writing a new spec? Start with the `e2e-test` skill**
(`.claude/skills/e2e-test/SKILL.md`, added 2026-09-02), not this file —
it's the short, procedural "how" (folder/naming conventions, the
golden-middle scoping rule, Testomat.io linking, cleanup shapes) distilled
from everything decided here, meant to load instead of the whole history
below for the common case of "add one more test." This file stays the
decision log — the *why* behind each convention, dates, alternatives
considered and rejected — consult it directly when the skill points here
for deeper reasoning, or when doing something the skill doesn't cover.

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
      UsersApi.ts          wraps GET /users (getUsers(), admin-only) and DELETE /users/:id
      interfaces/           ListUsersParams, User, GetUsersListResponse
      types/                 UserRole
  helpers/             Test-oriented utilities — stateless singletons by
                        default (see "Helpers" below for the one exception)
    commonHelper.ts       General-purpose grab bag, not Telegram-specific despite
                           the first occupant — e.g. Telegram Login Widget HMAC
                           signing, UUID v4 validation, random-int generation
                           (see "commonHelper.ts" below)
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
                            one-off values directly (e.g. BASE_URL,
                            DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_OFFSET,
                            DEFAULT_SEARCH_PROFILE_LIMIT)
                            rather than giving every single constant its
                            own file. A second,
                            deliberate exception to "no barrels" (the first is
                            interfaces/ folders) — see below.
    routes.ts             API paths, grouped by domain — mirrors api/'s structure
    httpStatus.ts          HTTP status codes actually asserted on (grows as tests need more, not pre-filled)
  testData/            Input payloads for specs, mirrors specs/'s own
                        structure exactly (including the per-endpoint
                        subfolder nesting, see specs/ below) — one file
                        per spec, same name and same path shape
                        (testData/auth/login/returnsBearerToken.ts,
                        testData/users/getUsers/filtersByUsername.ts) —
                        see "Synthetic data naming" below for the `e2e_`
                        username convention both follow.
  specs/               Playwright's testDir — one subfolder per
                        endpoint-group, mirrors api/; one test per file
                        (see "Spec naming: atomic files" below). **Always
                        a further per-endpoint subfolder**, one per
                        `api/` method (`login/`, `getUsers/`) — revised
                        2026-08-31 twice in one day: first to add the
                        subfolder once `getUsers` alone crossed 10 files
                        in a flat `specs/users/`, then again to apply it
                        to `auth/login/` too even with its single test,
                        for consistency across domains rather than a
                        per-domain judgment call each time (see "Spec
                        naming: atomic files" below for both). File names
                        inside a subfolder drop the now-redundant
                        endpoint prefix the subfolder already carries.
    auth/
      login/
        returnsBearerToken.spec.ts
    users/
      getUsers/
        filtersByUsername.spec.ts
        returnsAllUsers.spec.ts
        filtersByNonexistentUsername.spec.ts
        rejectsNonAdmin.spec.ts
        rejectsInvalidLimit.spec.ts
      setSearchProfileLimit/
        setsRandomLimit.spec.ts
        setsLimitToZero.spec.ts
        rejectsNonAdmin.spec.ts
        rejectsInvalidLimit.spec.ts
        rejectsNonexistentUser.spec.ts
      deleteUser/
        deletesSelf.spec.ts
        adminDeletesUser.spec.ts
        rejectsNonOwner.spec.ts
        rejectsNonexistentUser.spec.ts
  schemas/             JSON Schemas per endpoint response, for AJV-based
                        response validation — pulled from the live Swagger/OpenAPI
                        spec via mcp-openapi-server (below), not hand-duplicated
                        from memory. One subfolder per endpoint-group, mirrors
                        api/ — and, like every interfaces/ folder, gets its
                        own index.ts barrel (added 2026-08-31, once a single
                        spec started needing three schemas across two
                        domains at once): consumers import
                        `from '../../../schemas/users'`, not the individual
                        file.
    auth/
      LoginResponseSchema.ts
      index.ts
    users/
      ListUsersResponseSchema.ts
      SetSearchProfileLimitResponseSchema.ts
      index.ts
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
inherited from root. `schemas/<domain>/` folders followed the same
pattern once a real need showed up (see "Response schema validation"
below) — not `interfaces/` folders themselves, but the same "folder of
related, individually-authored files, worth one barrel" shape.

**Constants** (`constants/`) hold anything that would otherwise be a magic
string or number repeated across specs/API classes: route paths
(`routes.ts`, grouped by domain, mirroring `api/`'s own structure) and HTTP
status codes (`httpStatus.ts`) actually asserted on somewhere — not a
speculative full list of every possible status up front. **Also has an
`index.ts` barrel** (added 2026-08-28) — a second, deliberate exception to
"no barrels outside `interfaces/`": re-exports `routes.ts`/`httpStatus.ts`,
and hosts genuinely one-off values (`BASE_URL`, and — added 2026-08-30 —
`DEFAULT_PAGE_LIMIT`, `DEFAULT_PAGE_OFFSET`, `DEFAULT_SEARCH_PROFILE_LIMIT`,
see "GET /users coverage" below) directly in the barrel itself rather than
giving a single primitive its own file. Every consumer now imports from
`../../constants`, not individual files.

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

**Each `schemas/<domain>/` folder gets an `index.ts` barrel** (added
2026-08-31, prompted by `specs/users/setSearchProfileLimit/setsRandomLimit.spec.ts`
needing `LoginResponseSchema` + `ListUsersResponseSchema` +
`SetSearchProfileLimitResponseSchema` in one file — three separate
full-path imports, two of them from the same `schemas/users/` folder,
was the trigger to stop doing this by hand) — `export * from
'./XResponseSchema'` per file, same shape as the `api/*/interfaces/`
barrels. Consumers import `from '../../../schemas/users'`, not
`'../../../schemas/users/ListUsersResponseSchema'`.

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
"Environment variables"). The `sub` **shape** check delegates to
`commonHelper.isValidUuidV4()` (see "commonHelper.ts" below) rather than
a hand-rolled regex — decided in review: getting UUID version/variant
nibbles subtly wrong is exactly the kind of mistake a well-maintained,
single-purpose validator avoids. `decode` stays a private method; only
`expectTokenIsValid` (which calls it) is exposed, since nothing currently
needs the bare claims outside an assertion. `expectTokenIsValid` is a
plain synchronous method — no `async`, no dynamic import — since
`uuid-validate` is a real CJS package (see "commonHelper.ts" below for
why that particular package). Named `expectTokenIsValid`, not `validate`,
because — unlike `ResponseContract.validate` — nothing downstream
consumes the decoded claims, so there's no "returns typed data" naming
tension to avoid; a plain void assertion is exactly what it is.

**`commonHelper.ts`** (`isValidUuidV4`, added 2026-08-30): a second
method alongside `signTelegramLoginPayload`, prompted by
`specs/users/getUsers/filtersByUsername.spec.ts` needing the exact same UUID v4 check `jwtHelper.ts`
already did inline for the JWT `sub` claim — the second consumer this
project's own "extract once a second spec needs the same shape" bar asks
for (see "Test data & cleanup" below). Confirms `commonHelper.ts` is a
general-purpose helper by design, not a Telegram-only one that happened
to get a second method — `signTelegramLoginPayload` was just its first
occupant. Originally implemented as a fresh, single-purpose
`helpers/uuidHelper.ts` (mirroring one-file-per-concern the way
`jwtHelper.ts`/`responseContractHelper.ts` each own one thing) and folded
into `commonHelper.ts` instead once discussed — `commonHelper.ts` is
where genuinely miscellaneous, no-single-theme utilities belong, and a
second single-method file would just fragment that further. Originally
prototyped using the `uuid` package's `validate`/`version` functions
behind a dynamic `import('uuid')` (the same ESM-only workaround
`jwtHelper.ts` used to need, see below) — **replaced with the
`uuid-validate` package instead** (decided 2026-08-30, review): it's a
tiny, dependency-free, genuinely CommonJS package (`main`, no `"type":
"module"`), so a plain static `import validate from 'uuid-validate'`
works with this project's `esModuleInterop`, no dynamic import needed
anywhere. Its `validate(uuid, version)` does the same version/variant
nibble check `uuid`'s `validate`+`version` combo did — read its (tiny,
7KB) source directly before trusting it, not just the README. `uuid` was
removed from `package.json` entirely once nothing else needed it — the
whole ESM-only-CJS-project workaround it required (`jwtHelper.ts`'s old
`async`-only-for-a-dynamic-import shape) went away with it, not just
moved.

**`commonHelper.randomInt(min, max)`** (added 2026-08-31, prompted by
`specs/users/setSearchProfileLimit/setsRandomLimit.spec.ts` — see "PATCH
/users/:id/search-profile-limit coverage" below): a plain inclusive
`Math.floor(Math.random() * (max - min + 1)) + min`. Generic, not named
after the one field that first needed it (`randomSearchProfileLimit()`
was considered and rejected) — `commonHelper.ts` is the general-purpose
file specifically so a primitive like "a random integer in a range"
lives once and gets reused, the same reasoning that put `isValidUuidV4`
here rather than in a single-purpose file.

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
token needed for this). `specs/auth/login/returnsBearerToken.spec.ts` tracks the one user it
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
was specific to `login/returnsBearerToken.spec.ts` alone until
`specs/users/getUsers/filtersByUsername.spec.ts` (added 2026-08-30, see
"GET /users coverage" below) started duplicating it
verbatim — the "extract once a second spec needs the same shape" trigger
this section originally deferred has now fired. Not extracted yet as of
this writing — flagged here so it isn't lost, not addressed in the same
change that introduced the second occurrence.

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
  (`getUsers(accessToken, params?: ListUsersParams)`, bearer auth via
  header) and `DELETE /users/:id` (`deleteUser(accessToken, userId)`,
  added 2026-08-27 for cleanup — see "Test data & cleanup" above; named
  `delete()` until 2026-08-31, renamed to `deleteUser()` — matching the
  controller's own `UsersController.deleteUser` handler name — once
  `DELETE /users/:id` needed its own `specs/users/deleteUser/` subfolder
  as a first-class endpoint under test rather than only ever being called
  for cleanup; 7 call sites across every existing spec updated in the
  same pass, `routes.users.deleteById` left as-is since it already
  describes the route shape regardless of what the client method is
  called). `getUsers()`
  was named `list()` until 2026-08-30, renamed for the same "file name
  should describe what's being tested" reasoning behind the spec naming
  decision below — `routes.users.list` renamed to `routes.users.getUsers`
  alongside it. (This rename happened in two passes: first reasoning by
  "file name mirrors the API method name" like `login.spec.ts` ⇄
  `AuthApi.login`, then the spec file itself was renamed again shortly
  after once scenario-based spec naming was decided — see "Spec naming:
  atomic files" below. The method/route rename stands regardless of how
  the spec file ended up named.)
  `ListUsersParams` (`api/users/interfaces/`) mirrors the live query params
  (`telegramUsername`, `limit`, `offset`) — named to match the server's
  actual `ListUsersQueryDto` field, not renamed on the client side.
  `telegramUsername` was originally `search` on both the server and this
  client — renamed together 2026-08-23 (see root `CLAUDE.md` → "Admin
  access to Search Profiles and Users") once review caught that a generic
  "search" name didn't say what it actually filters on.
  `getUsers()` builds a `URLSearchParams` from whichever params are actually
  set, skipping `undefined` — chosen over widening `ListUsersParams` with
  an index signature (would silently accept unrelated extra keys) or
  casting at the call site (doesn't explain anything, just suppresses the
  check) to satisfy Playwright's indexed `params` type. `BackendApi`
  exposes it as `.users`, same facade pattern as `.auth`.
- Not treated as a generic "admin API client for testing admin features"
  — scoped to what this one persistence check needs. Extend it if/when a
  real admin-focused e2e test is written.

## Spec naming: atomic files (added 2026-08-30)

**One `test()` per spec file, from here on — file name describes the
scenario, not the endpoint/API method.** `login.spec.ts` (original name)
and the first `users` spec both already held exactly one test each, so
this was already true in practice; made explicit once ClickUp task
869er68uh's scenario list (~8-9 positive/negative cases across three
`users` endpoints, see "GET /users coverage" below) made clear that
naming a file after the bare API method doesn't scale — you can't have
`getUsers.spec.ts`, `getUsers.spec.ts`, and `getUsers.spec.ts` for three
different `GET /users` scenarios.

- **A subfolder per endpoint, one per `api/` method — applied
  universally, not gated by scenario count** (revised twice on
  2026-08-31; this is the second revision, superseding the first). First
  cut kept every spec flat in its domain folder (`specs/users/`,
  `specs/auth/`), reasoning that an extra nesting level was speculative
  structure ahead of real need. Revised once `GET /users` alone reached
  10 files in that one flat folder — the folder itself, not just
  individual file names, had become hard to scan, a *real*, materialized
  need. That first revision still tried to keep the bar scenario-count-based
  ("only nest once an endpoint heads toward double digits", `specs/auth/`
  explicitly left flat since `login` has exactly one scenario) — revised
  *again*, same day, once that inconsistency itself became the objection:
  a single-scenario `auth/login.spec.ts` sitting flat next to a
  ten-scenario `users/getUsers/*.spec.ts` subfolder meant two different
  rules depending on which domain you were looking at, which is worse for
  actually finding things than one predictable rule applied everywhere.
  Settled on: every endpoint gets its own subfolder, always, so the path
  shape is uniform (`specs/<domain>/<endpointMethod>/<scenario>.spec.ts`)
  regardless of how many scenarios that endpoint currently has — `login/`
  holds one file today for the same reason `getUsers/` holds ten, not by
  a different rule. Applied retroactively: `specs/auth/login.spec.ts` →
  `specs/auth/login/returnsBearerToken.spec.ts` (and the matching
  `testData/auth/login.ts` → `testData/auth/login/returnsBearerToken.ts`),
  same pass as the `users`/`getUsers` move.
- **File name shape inside a domain folder (no endpoint subfolder yet):
  `<endpointMethod><Scenario>.spec.ts`**; **inside a per-endpoint
  subfolder (now the default everywhere), just `<scenario>.spec.ts`** —
  the endpoint name lives in the folder name, so keeping it in the file
  name too would just be duplication (e.g.
  `specs/users/getUsers/filtersByUsername.spec.ts`, not
  `specs/users/getUsers/getUsersFiltersByUsername.spec.ts`;
  `specs/auth/login/returnsBearerToken.spec.ts`, not
  `specs/auth/login/loginReturnsBearerToken.spec.ts`). A corresponding
  `testData/.../<sameName>.ts` follows the spec file 1:1 and mirrors the
  same nesting.
- **`test.describe(...)` names: `'<endpoint> → <short scenario>'`**
  (revised 2026-08-31) — first cut left every spec's `describe` as the
  bare endpoint (`'GET /users'`, `'POST /auth/telegram'`), reasoning that
  it groups by endpoint for readability and costs nothing extra even with
  one test per file. Revisited once enough `GET /users` specs existed for
  that identical text to show up ten times in the Playwright/Testomat.io
  report with nothing to tell them apart at that level (only the test
  title further down the line differed). Now every `describe` pairs the
  endpoint with an abbreviated version of the file's own scenario — not
  the full test title verbatim, to avoid the title repeating twice per
  report line (e.g. `rejectsInvalidLimit.spec.ts` →
  `'GET /users → limit below min'`, test title still the fuller
  `'Rejects an out-of-range limit with 400'`). Applied to `login/
  returnsBearerToken.spec.ts` too, for the same consistency reasoning as
  the subfolder move above, even though `'POST /auth/telegram'` alone was
  already unambiguous on its own: `'POST /auth/telegram → returns bearer
  token'`.

## GET /users coverage (added 2026-08-30)

ClickUp task 869er68uh ("E2E: Cover Users endpoints") tracks dedicated
coverage of the `users` module, previously only exercised indirectly as a
side effect of `login/returnsBearerToken.spec.ts`. Built incrementally, one atomic spec per
scenario (see "Spec naming: atomic files" above) — the per-test detail
(which field, which constant) lives in the spec file itself via
descriptive `expect(..., message)` calls, not restated here; this section
only tracks what isn't obvious from reading the file.

- **`specs/users/getUsers/filtersByUsername.spec.ts`** — originally also
  asserted `user.id`'s UUID-v4 shape and `user.createdAt`'s date-time
  shape by hand. Removed the same day: `ListUsersResponseSchema` already
  declares `format: 'uuid'`/`format: 'date-time'` on those fields, and
  Ajv's `validateFormats` defaults to `true`, so `responseContract.validate`
  already rejects a malformed value on every `GET /users` response — verified
  directly (compiled the schema standalone, confirmed a malformed value
  fails validation) before removing, not assumed. `commonHelper.isValidUuidV4()`
  itself stays; it's still the right tool where schema validation doesn't
  reach, e.g. `jwtHelper.ts`'s decoded JWT `sub` claim.
- **`specs/users/getUsers/returnsAllUsers.spec.ts`** — calls `GET /users`
  with no filter. Asserts `users.length` is at least
  `minimumExpectedUserCount` (2 — the e2e admin identity plus this test's
  own user), not an exact count, since concurrent spec runs may
  transiently add their own not-yet-cleaned-up users (cleanup is
  per-spec, see "Test data & cleanup" above). Deliberately does **not**
  search the response for the created user (no `.find()`/`.filter()` on
  `listBody.users`, no presence assertion) — two reasons at once: (a) once
  real user counts exceed `DEFAULT_PAGE_LIMIT`, a fresh user isn't
  guaranteed to land on the unpaginated default page, which would make a
  presence check flaky through no fault of the endpoint; (b) "a specific
  user is findable via the API" is already fully covered by
  `filtersByUsername.spec.ts`, so re-checking it here would just
  be redundant coverage carrying that same flakiness risk for no new
  signal. Instead, `afterAll`'s `createdUserId` comes straight from
  `jwtHelper.decode(loginResponseBody.token).sub` — the JWT's `sub` claim
  already **is** `User.id` (verified by `jwtHelper.expectTokenIsValid`
  elsewhere), so cleanup never depends on this test's own list response
  at all. **Known, accepted limitation:** `expect(listBody.total, ...).toBe(listBody.users.length)`
  shares the same "total stays under `DEFAULT_PAGE_LIMIT`" assumption —
  a `Math.min(total, limit)`-based rewrite that holds at any scale was
  considered and deliberately not made (2026-08-30); left as the simpler
  literal-equality form for now, revisit once real user counts approach
  `DEFAULT_PAGE_LIMIT`, same trigger as the rest of this bullet.
- **`specs/users/getUsers/filtersByNonexistentUsername.spec.ts`** — a
  `telegramUsername` guaranteed to match no real user (DTO-level, this
  query param is a plain `@IsString()` with no format constraint, see
  `ListUsersQueryDto` — there's no malformed-input 400 case to test here,
  only "found nothing"). Creates no user and needs no `afterAll`: nothing
  to clean up when the whole point is that this username never matches
  anything.
- **`specs/users/getUsers/rejectsNonAdmin.spec.ts`** — first negative spec
  for this endpoint (`AdminGuard` → `403`, the one negative scenario
  869er68uh names explicitly for `GET /users`). Calls the endpoint with an
  ordinary self-service user's own bearer token, not an admin one — no
  `apiHelper` involved. Asserted via a plain `expect(response.status(), ...)`,
  not `responseContract.validate` — checked live via `mcp-openapi-server`
  first: `GET /users`'s `403` response has no `application/json` schema in
  the spec at all (`@ApiForbiddenResponse` has no `type:`), so there's
  nothing to validate the body against; `httpStatus.FORBIDDEN` (403) was
  added to `constants/httpStatus.ts` for this. Cleanup deletes the created
  user via its own (non-admin) token — self-service delete needs no admin
  rights, only ownership (see root `CLAUDE.md` → "Self-service account
  deletion").
- **`rejectsInvalidLimit.spec.ts`** (`limit=0`, violates
  `ListUsersQueryDto`'s `@Min(1)`) — the *one* representative
  invalid-`limit`/`offset` spec for this endpoint. **Trimmed down from
  six on 2026-08-31**, after a testing-pyramid brainstorm: this file
  originally had five siblings (`rejectsLimitAboveMax.spec.ts` /
  `@Max`, `rejectsNegativeLimit.spec.ts` / `@Min` again with a different
  value, `rejectsNonIntegerLimit.spec.ts` / `@IsInt`,
  `rejectsNegativeOffset.spec.ts` and `rejectsNonIntegerOffset.spec.ts`
  mirroring the same two mechanisms for `offset`) — one file per
  `class-validator` boundary. All six passed, but none of them tested
  anything specific to this being a *deployed, running* system: `@Min`/
  `@Max`/`@IsInt` on a DTO is pure, deterministic `class-validator`
  behavior with zero infrastructure dependency, exactly the kind of case
  a root-project unit test on `ListUsersQueryDto` itself proves in
  milliseconds, with no network, no admin login, no rate-limit exposure.
  Decided: e2e keeps exactly one "invalid input → 400" case per endpoint,
  as a smoke check that `ValidationPipe` is actually wired on the real,
  deployed route — not an exhaustive boundary matrix; the matrix belongs
  at the unit tier instead (not yet added there — tracked as follow-up,
  not this ticket's scope). `MAX_PAGE_LIMIT` (added to `constants/index.ts`
  for the now-deleted above-max case) was removed again, since nothing
  else needs it. Corresponding Testomat.io test cases
  (`dcf83b5f`, `cd605a0f`, `4aff2e4f`, `1e75b6b2`, `969b762c`) deleted via
  `mcp__testomatio__tests_delete`, not just abandoned — an orphaned
  Testomat.io entry with no matching spec is worse than no entry at all.
  **Requires a valid admin token, not an unauthenticated or non-admin
  one** — Nest's request lifecycle runs guards before pipes, so calling
  with a bad/missing token would hit `AdminGuard`/`JwtAuthGuard`
  (401/403) before `ValidationPipe` ever inspects `limit`, testing the
  wrong layer entirely. `httpStatus.BAD_REQUEST` (400) added alongside
  `FORBIDDEN` for this.

All five link to Testomat.io test cases (`@T8a3ffb44`, `@Td2e104b0`,
`@Tfecf8354`, `@Tc53f1b89`, `@Td1102f2e`) via `mcp__testomatio__tests_create`
— see "Testomat.io reporting" below, and "Testomat.io suite structure"
just below for where they live.

**Testomat.io suite structure mirrors `specs/` exactly, one level for
each folder level (revised 2026-08-31, same two-pass change as the local
subfolder move above).** All 11 tests originally sat flat in one
auto-created `product.backend` suite (`a5083c07`, `file_type: "file"`) —
reorganized into `product.backend` (converted to `file_type: "folder"`)
→ `auth` (`23bf007b`, converted to `folder`) → `login` (`ba3b0ba0`,
holds `login/returnsBearerToken.spec.ts`'s `@T2ec3d41f`), and `users`
(`a1ed15fe`, `folder`) → `getUsers` (`3e0ddf19`, held all ten `GET
/users` tests at the time of this move — trimmed to five shortly after,
see "GET /users coverage" above) — four suite levels total
(`product.backend/auth/login`, `product.backend/users/getUsers`),
matching `specs/auth/login/` and `specs/users/getUsers/` one level for
one level. `auth` was flattened directly under `product.backend` at
first (mirroring the local structure's own first pass, which also left
`specs/auth/` flat) and converted to hold a `login` child suite in the
same second pass that added the local `login/` subfolder — for the same
"uniform path shape regardless of current scenario count" reasoning (see
"Spec naming: atomic files" above), not because `login` itself grew past
one test. A suite can't hold both direct tests and child suites at once
(`file_type: "folder"` update is rejected with a 422 while any test still
references it directly), so converting a suite to a folder always means:
create the new child suite(s) first (initially parentless, since the
would-be parent isn't a folder yet), move every test into them, convert
the now-empty former-leaf suite to `folder`, then reparent the new child
suite(s) under it — not a single atomic operation, done twice here
(once for `users`/`getUsers`, once more for `auth`/`login`). Moving a
test between suites (`tests_update`'s `suite_id`) doesn't affect the
`@T<id>` tag or break CI reporting/linking — `@testomatio/reporter`'s
`linkTest()` matches by the test's own id, not by suite path, verified by
re-running the full suite after each move (same tags linked
successfully both times).

## PATCH /users/:id/search-profile-limit coverage (added 2026-08-31)

Second `users` endpoint against 869er68uh, same incremental
one-scenario-at-a-time approach as `GET /users`. Own subfolder
(`specs/users/setSearchProfileLimit/`, Testomat.io suite `26521242`
under `users`) from the start, per "Spec naming: atomic files" above —
no flat-first phase for this one, unlike `getUsers`/`login`'s original
history.

- **`setsRandomLimit.spec.ts`** — first spec, a random valid limit via
  `commonHelper.randomInt(1, 1000)` rather than a fixed literal, so the
  assertion (`searchProfileLimit` in the response equals what was sent)
  can't accidentally pass because of a coincidental match with some other
  hardcoded value elsewhere. The random value is computed once in
  `testData/.../setsRandomLimit.ts` at module load (not inside the test
  body) — `randomLimitMin`/`randomLimitMax` (1/1000) stay local consts in
  that file, only the resulting `randomLimit` is exported, same "testData
  holds the actual input value" shape as every other spec's testData.
  Range `[1, 1000]` deliberately excludes `0` — `0` is a legal,
  meaningful value here (disables new Search Profile creation, see root
  `CLAUDE.md` → "Admin override mechanism") split into its own separate
  spec (`setsLimitToZero.spec.ts`, below) rather than folded into the
  random-value case. No chosen upper bound exists on the server side
  (`SetSearchProfileLimitDto` has `@Min(0)`, no `@Max`) — `1000` is just
  this suite's own arbitrary "large enough to not look like a boundary
  value" choice, not a real constraint being tested.
- **`setsLimitToZero.spec.ts`** — `0` specifically, verifying it's
  accepted (not rejected the way a negative value would be — `0` passes
  `@Min(0)`, unlike `GET /users`'s `limit`/`offset` which both reject
  `0`/negative differently per field, see "GET /users coverage" above;
  worth its own spec precisely because `0` is a legitimate edge value
  here, not an invalid one).
- **Both specs verify persistence, not just the `PATCH` response** — a
  follow-up `GET /users?telegramUsername=` (admin token) confirms
  `searchProfileLimit` actually landed in the row, catching a
  hypothetical bug where the endpoint echoes back the requested value in
  its response without actually saving it. Added after `setsRandomLimit.spec.ts`'s
  first draft only checked the `PATCH` response body.
- `UsersApi.setSearchProfileLimit(accessToken, userId, limit)` (new
  method) and `routes.users.setSearchProfileLimit(id)` added alongside
  the existing `getUsers`/`delete`. `SetSearchProfileLimitResponseSchema`
  pulled live the same way every other schema here is (see "Response
  schema validation" above) — this endpoint's response DTO already had
  its `type:` wired up server-side (root `CLAUDE.md`'s "Response DTOs are
  required too"), so, unlike the `GET /users` negative specs, this one
  *does* have a schema to validate against even on the success path.
- Target user's `id` for the `PATCH` call comes from the same
  JWT-`sub`-decode approach as `getUsers/returnsAllUsers.spec.ts` (see
  "GET /users coverage" above) — login once, decode, use directly —
  rather than a second lookup call.

**Negative specs (added 2026-08-31), written applying the trimmed-down
rule from the start** (see "GET /users coverage" above → the six-to-one
`rejectsInvalidLimit.spec.ts` trim) rather than over-building and
trimming after, this time:

- **`rejectsNonAdmin.spec.ts`** — `AdminGuard` → `403`, same shape as
  `getUsers/rejectsNonAdmin.spec.ts` (log in an ordinary user, call the
  endpoint with their own token, no `apiHelper` involved). Targets the
  caller's own id (from the JWT `sub`) — irrelevant to the outcome, since
  `AdminGuard` runs before the handler ever reads `:id`, but using a real
  id keeps the call realistic rather than reaching for a throwaway one.
- **`rejectsInvalidLimit.spec.ts`** — the *one* representative
  invalid-`limit` case (`limit=-1`, violates `SetSearchProfileLimitDto`'s
  `@Min(0)`) → `400`. Deliberately not paired with a non-integer sibling
  this time (unlike the six-spec `GET /users` history this rule reacted
  to) — one case per endpoint is the rule now, not "one per field like
  before, then trim."
- **`rejectsNonexistentUser.spec.ts`** — a random, well-formed
  (`randomUUID()`) but never-created id → `404` (`UserNotFoundError`,
  mapped by `SetSearchProfileLimitUseCase`). Unlike the `class-validator`
  cases, this one earns its e2e place under the same rule rather than
  despite it: "does this id exist" is use-case-level branching logic
  specific to this endpoint, not generic DTO shape validation reusable
  across the whole app — nothing at the unit tier already proves the
  controller/use-case actually maps a missing row to `404` end-to-end.
- **`rejectsInvalidLimit.spec.ts` and `rejectsNonexistentUser.spec.ts`
  create no user at all** — a `randomUUID()` target is enough for both:
  DTO validation runs before the handler ever queries the database (so
  the `400` case's id doesn't need to exist), and the `404` case's whole
  point is that the id *doesn't* exist. No `afterAll`, no `testData` file
  for either — only `rejectsNonAdmin.spec.ts` logs in a real user (needed
  for a real non-admin bearer token) and therefore only it needs cleanup.
- `httpStatus.NOT_FOUND` (404) added alongside `BAD_REQUEST`/`FORBIDDEN`
  for this. None of the three has a response schema in the live spec
  (checked via `mcp-openapi-server` before writing any of them) — same
  plain `expect(response.status(), ...)` shape as every other
  no-schema negative case in this file.

## DELETE /users/:id coverage (added 2026-08-31)

Third `users` endpoint against 869er68uh, and the last one this ticket
covers. Own subfolder from the start (`specs/users/deleteUser/`,
Testomat.io suite `12c1ce9a` under `users`), same as
`setSearchProfileLimit`.

- **`deletesSelf.spec.ts`** — the self-service positive case (log in,
  delete your own account with your own token, `204`). **No `afterAll`,
  deliberately** — unlike every other spec in this file, the action under
  test *is* the cleanup; adding a second delete call after an already-
  successful one would just be asserting the same thing twice (and would
  itself now correctly `404`, since the row is already gone). Verifies
  more than the status code: a follow-up admin `GET
  /users?telegramUsername=` confirms the user is actually gone (`users:
  []`, `total: 0`), not just that the endpoint returned `204` — same
  "verify persistence, don't trust the response alone" reasoning as
  `setSearchProfileLimit`'s specs (see above). `httpStatus.NO_CONTENT`
  (204) added; no response schema exists for this status by HTTP
  definition (a `204` has no body), matching root `CLAUDE.md`'s own
  `@ApiNoContentResponse` exception to "every response needs a `type:`".
- **Scope note, not a gap**: the original ticket description for this
  endpoint also says self-deletion "cascades to their Search Profiles" —
  not verified here. No Search Profile e2e coverage or API client exists
  in this suite yet (that's ClickUp 869er68qq/869er68qu, both still
  open). Flagged directly on 869er68qq (the self-service Search Profiles
  ticket, since cascade-on-delete is closest to that module's own CRUD
  scope) rather than silently dropped — pick it up once `POST
  /search-profiles` is e2e-callable: create a user, create a profile for
  them, delete the user, confirm the profile is gone too.
- **`adminDeletesUser.spec.ts`** — the admin-override positive case,
  same shape as `deletesSelf.spec.ts` but `deleteUser()` is called with
  the *admin's* token, not the target's own — the only difference
  between the two specs is which bearer token authorizes the call. No
  `afterAll` here either, same reasoning: the admin's delete call is
  itself the cleanup.
- **`rejectsNonOwner.spec.ts`** — the one negative case that actually
  needs real cleanup in this endpoint's coverage: an "attacker" (a real,
  logged-in, non-admin, non-owning user) attempts to delete a "victim"
  (a second, separate real user) and is rejected with `404` — the
  enumeration-safe pattern already established for Search Profiles (root
  `CLAUDE.md` → Security), not a `403` that would leak whether the id
  exists. Since the delete attempt under test is *expected to fail*,
  neither the victim nor the attacker actually get removed by it — this
  spec is the only one of the four with a real `afterAll`, self-deleting
  both created users via their own tokens.
- **`rejectsNonexistentUser.spec.ts`** — same shape as
  `setSearchProfileLimit/rejectsNonexistentUser.spec.ts`: a
  `randomUUID()` target guaranteed not to belong to any real user, admin
  token, `404`. No user created, no `afterAll`, no `testData` file.
- All four link to Testomat.io test cases (`@T66a36d1c`, `@T4ef0f916`,
  `@T8e752430`, `@T2f3ed283`) in the `deleteUser` suite.

## Synthetic data naming (added 2026-08-30)

Every login this suite performs creates a real row in the production
`users` table (see "Test data & cleanup" above) — `telegramUsername`
values need to stay recognizable as synthetic, greppable via a plain
`WHERE telegram_username LIKE 'e2e\_%'`, without adding an `isTest`/
`environment` field to the domain model (a separate, deliberate decision
— domain doesn't get shaped around test infrastructure for a
not-yet-live risk with zero real users to confuse test data with).

**Convention: `e2e_` prefix (lowercase, underscore), on `telegramUsername`
only.** Landed on this specifically because `helpers/apiHelper.ts` already
had a real, shipped precedent — `ADMIN_USERNAME = 'e2e_admin'` — predating
this discussion; matching it beat inventing a second, competing style
(`e2e-` with a dash and `_E2E_` wrapped-uppercase were both considered and
dropped for exactly that reason). Scoped to `telegramUsername` alone, not
`telegramUserId`: the latter is a random `randomUUID()` value in test data
standing in for what a real Telegram numeric id would be, and stays
opaque/unprefixed to keep that resemblance — `telegramUsername` is
already the human-readable, directly-queryable field (it's what `GET
/users?telegramUsername=` filters on), so it's the one that actually needs
to read as synthetic at a glance.

Applied so far: `testData/auth/login/returnsBearerToken.ts`
(`e2e_login_${Date.now()}`), `testData/users/getUsers/filtersByUsername.ts`
(`e2e_get_users_${Date.now()}`), and
`testData/users/setSearchProfileLimit/setsRandomLimit.ts`
(`e2e_set_limit_random_${Date.now()}`) — a `e2e_<spec-context>_<timestamp>`
shape, `<spec-context>` naming what the spec covers, `<timestamp>`
keeping concurrent runs from colliding on the exact same username. Apply
the same `e2e_<context>_${Date.now()}` shape to every future spec's
synthetic `telegramUsername`, and the equivalent recognizable prefix in
`SearchProfile.name` once specs start creating those (869er68qq/869er68qu)
— not a new pattern to invent per spec.

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

**Which branch's test code runs is deliberately different per trigger**
(decided 2026-08-30, while making `deploy.yml` branch-aware — root
`CLAUDE.md` → "Deploys the branch you pick, not always `main`"). No
explicit `ref:` on the `actions/checkout` step, and the two triggers
resolve that default differently: `workflow_run` has no built-in
awareness of which branch the triggering `Deploy` run actually used —
GitHub defaults an unset `ref:` to the repo's default branch for this
event type, not `github.event.workflow_run.head_branch` — so the
automatic post-deploy run always checks out `main`'s e2e suite,
regardless of which branch just got deployed. `workflow_dispatch`, by
contrast, defaults `ref:` to whichever branch was picked in the "Run
workflow" UI. Considered making both branch-aware (an explicit
`ref: ${{ github.event.workflow_run.head_branch }}` for the
`workflow_run` case) and deliberately didn't: e2e specs here are
black-box contract tests against the live API, not app-code-coupled
unit tests (see "What this is" above) — the automatic run's job is to
be a stable, independent regression check on whatever's now live,
un-influenced by whatever the just-deployed branch's own tests happen
to say. Validating a branch's *own*, in-flight test changes together
with its app changes is what the manual `workflow_dispatch` trigger is
for — pick that branch explicitly when that's actually what's needed,
rather than making the always-on check track it automatically.

Steps: `actions/checkout@v7`, `actions/setup-node@v7` (Node 22, npm cache
keyed off `tests/e2e/package-lock.json` specifically — a different lockfile
than the root project's), `npm ci` and `npm test` both run with
`working-directory: tests/e2e` (this is its own npm project, not something
`npm ci` at the repo root would touch). Both actions were bumped from `v4`
2026-08-29 — `v4` bundled a Node 20 runtime that GitHub Actions was
deprecating, forcing runs onto Node 24 with a warning; `v7` declares
`using: node24` natively, so the warning is gone rather than tolerated.

**Secrets** (GitHub repo Settings → Secrets and variables → Actions):
`TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_USER_ID` — same values as
`tests/e2e/.env` locally, injected as real process env vars via the step's
`env:` block. No secret named `BASE_URL` — the `constants/index.ts`
default (`https://befirstapp.com`) is already correct for where this
actually needs to point, so there's nothing to override.

**Telegram reporting (added 2026-08-29)**, closing the ClickUp task filed
2026-08-28 ("publish e2e results to a Telegram channel so a red prod run
gets noticed without checking Actions/Testomat.io by hand"). Two new
secrets: `TELEGRAM_REPORT_BOT_TOKEN` and `TELEGRAM_REPORT_CHAT_ID` —
deliberately **not** a reuse of the existing `TELEGRAM_BOT_TOKEN`, which
turned out to be a placeholder string (see root `.env`'s own comment),
never registered with Telegram via BotFather — it only ever served as
local HMAC key material for signing/verifying the Login Widget payload
(root `CLAUDE.md` → "Planned auth model"), so it can't authenticate any
real Bot API call. Registered a second, real, dedicated bot
(`@befirst_ci_reports_bot`) for this instead of "upgrading" the
placeholder — keeps an auth-flow secret and an unrelated CI-reporting
concern from becoming entangled. `TELEGRAM_REPORT_CHAT_ID` is the
target channel's numeric id (`-100...`) — channels only deliver
`channel_post` updates to a bot that was already an admin *at the time*
a message was posted, so the id was obtained by adding the bot as
channel admin, posting a message, then reading it back via
`getUpdates`. Verified live before trusting it: `getMe` confirmed the
token matches the admin-added bot, `getWebhookInfo` ruled out a stray
webhook silently swallowing updates, and real `sendMessage` round-trips
(success/failure branches, with/without a Testomat.io run id) were
posted to the actual channel.

Three steps after `npm test`, all `if: always()` so they run whether
the suite passed or failed:

- **`testomatio_run`** reads `@testomatio/reporter`'s own
  `${os.tmpdir()}/testomatio.latest.run` file — found by reading the
  installed package's source (`lib/utils/utils.js` →
  `storeRunId`/`readLatestRunId`), not documented — to get the
  just-created run's id as a step output. No Testomat.io API call
  needed; the reporter already wrote it locally during the run.
- **`job_url`** resolves the *specific job's* log page
  (`.../actions/runs/<run_id>/job/<job_id>`), not just the run summary
  — the `github` context only exposes the job's YAML key (`e2e`) as a
  string, not the numeric job id the URL needs, so this calls
  `GET /repos/{repo}/actions/runs/{run_id}/jobs` with `github.token` and
  matches by job name via `jq`. Needs `actions: read` added to the
  workflow's `permissions:` block (`contents: read` alone doesn't grant
  it — an explicit `permissions:` block sets every unlisted scope to
  `none`, not a default). **Falls back to the run-level URL if the job
  id can't be resolved** (empty or `null` from `jq`, e.g. the API call
  itself fails) — caught in review: without this, an empty
  `url` would produce a `sendMessage` call with an empty button `url`,
  which Telegram's Bot API rejects outright (`BUTTON_URL_INVALID`),
  silently dropping the *entire* notification — including on the exact
  runs (failures) where getting notified matters most. The fallback
  guarantees `steps.job_url.outputs.url` is always a valid, non-empty
  link.
- The final step posts one message via `curl` to the Bot API's
  `sendMessage`, with two inline-keyboard buttons ("Build Logs",
  "Testomat.io" — real Telegram buttons via `reply_markup`, not plain
  in-text links, built with `jq` for correct JSON escaping) — the
  Testomat.io button only appears if `testomatio_run` resolved a run
  id. `curl --data-urlencode` (not manual string-building) handles
  encoding correctly.

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
