# BeFirst Backend

## Product idea

BeFirst is an **Opportunity Platform**, not a job aggregator. Goal: detect new
opportunities as fast as possible and notify the user. Jobs are the first
Opportunity type, but the model must not depend on the concept of "Job" — tomorrow
it could be visa slots, exams, grants, conferences, apartments, etc.

**Naming:** "BeFirst" is the product/brand. "Product Backend" (`package.json`
`name`/`description`, Swagger title, the `/product-backend-api/swagger` path) is
this specific repo/service's identifier — the plan is more backend services under
the BeFirst platform down the line, each named after what it does, not repeating
the brand name in every service.

## MVP (current stage)

- One source: **DOU**.
- One notification channel: **Telegram**.
- User creates a Search Profile → the system monitors DOU → on a match, a Telegram
  notification is sent.
- No AI, no recommendations, no analytics dashboard, no multiple sources.

## Stack

NestJS, TypeScript, Jest, Node 22 (see `.nvmrc` / `engines` in `package.json`).
PostgreSQL via Docker + Prisma are wired up (see "Persistence" below). Redis/BullMQ
— **later**, added only when actually needed, not wired up upfront.

## Naming conventions

- **Folders**: `camelCase` (`searchProfile`, `createSearchProfile`, `valueObjects`).
- **Files that export a class or a Nest-decorated artifact** (entities, Value
  Objects, use cases, controllers, modules, DTOs, port interfaces): `PascalCase`,
  the file name matches the primary exported symbol exactly
  (`SearchProfile.ts`, `CreateSearchProfileUseCase.ts`, `SearchProfileRepository.ts`,
  `CreateSearchProfileDto.ts`).
- **Files that export a plain function/utility, not a class** (e.g. a presenter):
  `camelCase` (`searchProfilePresenter.ts`).
- **Test files** (`.spec.ts`) are `camelCase` even when testing a `PascalCase`
  class — a spec file exports no class itself, it just registers `describe`/`it`
  blocks, so it follows the "not a class" rule
  (`SearchProfile.ts` → `searchProfile.spec.ts`,
  `CreateSearchProfileUseCase.ts` → `createSearchProfileUseCase.spec.ts`).
- **Interfaces, type aliases and enums live in their own file**, never mixed
  into a class's file — logic (classes) and contracts are always separated, each
  into its own dedicated subfolder next to what uses them:
  - `interface` declarations (a use case's exported input/output, a VO's `Props`
    shape) go in a sibling `interfaces/` folder
    (`application/createSearchProfile/interfaces/CreateSearchProfileInput.ts`,
    `domain/interfaces/SearchPreferencesProps.ts`, `domain/interfaces/SearchProfileProps.ts`,
    `domain/valueObjects/interfaces/LocationFilterProps.ts`).
  - Standalone type aliases / unions acting as an enum go in a sibling `types/`
    folder — `interfaces/` and `types/` are separate because they're different TS
    constructs, not because it matters much in practice
    (`domain/types/SearchProfileStatus.ts`, `domain/valueObjects/types/Seniority.ts`).
  - No exceptions for "private, unexported" props types — even
    `SearchProfileProps` (used only inside `SearchProfile.ts`) lives in
    `domain/interfaces/SearchProfileProps.ts`. Consistency of "logic here,
    contracts there" wins over the small ceremony of one extra file.
- Error classes (`extends DomainError`) live in their own sibling `errors/`
  folder, one file per class, PascalCase matching the class name — same tier
  as the `interfaces/`/`types/` folders above
  (`domain/errors/InvalidSearchProfileNameError.ts`,
  `domain/errors/InvalidSearchProfileStatusTransitionError.ts`,
  `domain/valueObjects/errors/LocationRequiresCountryError.ts`,
  `domain/valueObjects/errors/NegativeSalaryError.ts`,
  `application/errors/SearchProfileNotFoundError.ts`). Previously these were
  co-located inside the one class's file that raised them (e.g.
  `InvalidSearchProfileNameError` inside `SearchProfile.ts`), on the
  reasoning that an error owned by exactly one class is still logic, not a
  contract, so the interfaces-separation rule didn't apply to it. Revisited
  once `SearchProfileNotFoundError` needed its own file anyway — it's raised
  by every use case that looks up a `SearchProfile` by id, not owned by one
  class — since applying one uniform rule to every error (its own file,
  regardless of how many places raise it) is simpler than deciding per error
  whether it's "owned by exactly one class" today and might need moving
  later.
- Exception: `main.ts` stays lowercase — it's a bootstrap script, not a class.
- HTTP route paths stay kebab-case (`@Controller('search-profiles')`) — that's a
  URL convention, unrelated to file/identifier naming.

## Testing

Tests never sit next to source files. They live under a root-level `tests/`,
split by kind, mirroring the `src/` path of whatever they test:

```
tests/
  unit/
    modules/
      searchProfile/
        domain/
          searchProfile.spec.ts
        application/
          createSearchProfile/
            createSearchProfileUseCase.spec.ts
```

`integration/` and later `e2e/` get added the same way, once there's something
real to test at that level (a Postgres repository, an HTTP flow) — not before.
`integration/` now exists: it boots the real `AppModule` (real `PrismaModule`,
real `PrismaSearchProfileAdapter`) via `@nestjs/testing`, drives it over HTTP
with `supertest`, and verifies the row actually landed in Postgres using a
second, independently-constructed `PrismaClient` — not the app's own DI
instance — so the assertion can't pass just because the app is holding onto
the same in-memory object. Run via `npm run test:integration`, which needs the
Docker Postgres container up and migrated first (same `.env` as the app) and
loads it the same `--env-file` way as `start`/`start:prod` (see "Environment
variables" below) since plain `jest` doesn't read `.env` on its own. `test:unit`,
`test:unit:watch`, `test:integration` are named explicitly per tier —
deliberately no bare `test`/`test:watch` alias, since npm's reserved `test`
script name says nothing about *which* suite runs once more than one exists.
The pre-commit hook (see "Pre-commit hook" below) calls `test:unit` by name,
so it never accidentally requires Postgres to be running.

Shared test doubles/fixtures live in `tests/unit/helpers/`, not nested inside the
module tree they happen to be used by first — they aren't mirroring a `src/`
file, they're infrastructure for the tests themselves (parallel to how `common/`
sits alongside `modules/` in `src/`). Naming there is its own convention,
deliberately different from `src/`: every file is `camelCase` and ends with
`Helper`, regardless of whether it exports a class or a function
(`fakeSearchProfileRepositoryHelper.ts`, `buildSearchProfileHelper.ts`) — no dot
before the suffix. This is a narrow, intentional exception to the "class files
are PascalCase" rule: it signals "test helper" at a glance over signaling
"this exports a class," which matters more inside a helpers folder specifically.

Interfaces shared across `tests/unit/helpers/` live in `tests/unit/interfaces/`
— scoped to unit tests specifically, not a repo-wide `tests/interfaces/`. One
file per interface (PascalCase, matching the `src/` convention since these are
plain `interface` declarations, not helpers), plus a barrel `index.ts`
re-exporting all of them (`export * from './BuildSearchProfileOverrides'`) —
consumers import from `../interfaces`, not the individual file. This is the
only place under `tests/unit/` that uses a barrel; `src/` deliberately doesn't,
to keep import paths traceable to their real source file. `integration/` and
`e2e/`, once they exist, get their own `helpers/`/`interfaces/` the same way if
they need them, for anything tier-specific — not a shared one across test kinds.

**`tests/helpers/`** (2026-08-06, sibling to `unit/`/`integration/`, not
nested inside either) is the one exception to "not shared across test
kinds" — reserved specifically for pure, tier-agnostic functions with zero
test-tier-specific behavior, as opposed to test doubles/fixtures whose
whole reason to exist is tier-specific (`FakeSearchProfileRepository` must
stay unit-only by design: integration tests exercise the real Prisma
adapter, a fake wouldn't even make sense there). First occupant:
`signTelegramLoginPayload` (HMAC signing, used identically by unit specs for
`TelegramLoginVerifier`/`AuthController` and by the integration spec for
`AuthController`) — originally duplicated verbatim into a would-be
`tests/integration/helpers/` copy, until IDE duplicate-code detection
caught it and it moved here instead, once duplicating it was clearly just
going to drift the two copies apart with no actual independence benefit.

Jest config lives in `jest.config.ts` at the **repo root**, not inside `tests/`
— same tier as `tsconfig.json`/`eslint.config.mjs`/`.prettierrc`, alongside every
other tool config. Jest's zero-config auto-discovery only looks at the project
root by default; nesting the config under `tests/` would mean every invocation
needs an explicit `--config` flag, and
`rootDir` would need to escape back out to reach `src/` (`rootDir: '..'`) since
`src/` isn't inside `tests/`.

Tests import from `src` via the `@app/*` path alias (`@app/modules/...`), configured
in `tsconfig.json` (`paths`) and Jest (`moduleNameMapper`) — this exists to keep
test imports sane now that they're 5-6 folders away from `src`.

**Assertion order:** all variable declarations (`const`/`let`) go before all
`expect()` calls in a test body — never interleave a declaration between two
assertions. Exception, only when the code under test makes it genuinely unsafe to
do otherwise: `Result.value` throws if `isSuccess` is `false`, so a test can't
safely bind `const profile = result.value` before asserting `isSuccess` first.
In that case, don't name an intermediate variable either — inline the repeated
access (`expect(result.value.status)...`, `expect(result.value.name)...`) rather
than reintroducing a declaration between assertions.

## Path alias in `src/`

`@app/*` also works at runtime inside `src/`, via `tsconfig-paths` registered in
`main.ts` through `import './registerPaths'` — `registerPaths.ts` calls
`tsconfigPaths.register({ baseUrl: __dirname, paths: { '@app/*': ['*'] } })`,
using `__dirname` so it resolves correctly against the compiled `dist/` layout,
not the `src/` source layout. In `main.ts`, external-library imports
(`reflect-metadata`, `@nestjs/*`) come first, then `./registerPaths`, then
`./AppModule` — imports are still grouped "external, then internal", but
`registerPaths` must precede `AppModule` specifically, since `AppModule` is the
first internal import that transitively uses `@app/*`; the external imports
don't touch our source tree at all, so their relative order doesn't matter.
`tsconfig-paths` is a regular `dependencies` entry (not `devDependencies`) — it
must exist at runtime in production. Verified end-to-end: `nest build` +
`node dist/main.js` actually resolves `@app/...` imports; `tsc`-only
type-checking wouldn't have caught a runtime resolution gap.

**When to use it in `src/`:** only for imports that cross into `common/` (e.g.
`@app/common/kernel/Result`) — those were the ones producing 3-4-level
`../../../../` chains. Keep ordinary same-module relative imports
(`./SearchPreferences`, `../valueObjects/LocationFilter`) as relative — they're already
short, and forcing `@app/modules/searchProfile/domain/...` on a one-folder-over
import would make it less readable, not more.

`tsconfig.build.json` sets `"rootDir": "./src"` **explicitly** — without it,
TypeScript infers `rootDir` as the common ancestor of every compiled file, and
any `.ts` file that ever lands at the repo root (e.g. `jest.config.ts`) silently
drags that inference up to the repo root too, shifting every build output down
one level (`dist/src/main.js` instead of `dist/main.js`) without erroring. Explicit
`rootDir` turns that into a loud build error instead ("file X is not under
rootDir") the moment a future root-level `.ts` file isn't excluded — caught this
the hard way once. `jest.config.ts` itself is excluded from
`tsconfig.build.json` (it has no business being compiled into the production
build). `tsBuildInfoFile` is also pinned explicitly to `./dist/tsconfig.build.tsbuildinfo`
— TypeScript's default location for that cache file shifted once `rootDir`
became explicit, and it started leaking a build artifact to the repo root
instead of into `dist/`. Recurred with `prisma.config.ts` and Prisma's
generated `generated/prisma/*.ts` output — same fix, solved that time by
excluding both; any future root-level `.ts` file isn't excluded automatically,
same class of bug will recur (Prisma's client generator now writes into
`node_modules/@prisma/client` again instead, see "Persistence" below, which
sidesteps this specific case — but the underlying rule still holds for
anything else that lands at the repo root).

## Tooling

ESLint (flat config, `typescript-eslint` + `eslint-plugin-prettier`) and Prettier
are set up from day one — `npm run lint` / `npm run format`. Config lives in
`eslint.config.mjs` / `.prettierrc`. Avoid `eslint-disable` comments where a real
code fix exists: e.g. a repository method implementing an async port
(`Promise<T>`) but with nothing to actually `await` (`FakeSearchProfileRepository`
in `tests/unit/helpers/`) should drop `async` entirely and `return Promise.resolve(value)` —
that satisfies the interface without tripping
`@typescript-eslint/require-await`, so no suppression is needed at all.

**Pre-commit hook** (Husky + lint-staged, `.husky/pre-commit` + `.lintstagedrc.json`)
runs `eslint --fix` on staged `{src,tests}/**/*.ts` files only — same scope as
`npm run lint`, not the whole repo, so it stays fast. Prettier isn't a separate
step: `eslint-plugin-prettier` already reports/fixes formatting as an ESLint
rule, so `eslint --fix` alone covers both. Auto-fixable issues (formatting,
import order) get fixed and re-staged silently; a real error (e.g. an unused
variable) aborts the commit with the offending file/line, nothing partially
staged. Verified both paths directly rather than assuming lint-staged's default
behavior: committed a deliberately misformatted file (got reformatted and
committed) and a deliberately unfixable one (commit was blocked, working tree
reverted to its pre-commit state).

The hook also runs the full unit suite (`npx lint-staged && npm run test:unit`) — unit
tests have no I/O by definition, so they stay fast regardless of how many get
added, unlike integration/e2e. That's also why integration/e2e never belong in
a local git hook: **unit** tests run pre-commit (this hook), **integration**
tests run in CI before deploy, **e2e** tests run in CI after deploy, against
the actually-deployed app. Each tier gets checked at the point where it's cheap
to run and still catches what it's meant to catch.

**CI** (`.github/workflows/integration-tests.yml`) implements the integration
tier above: on every push, to any branch, it spins up a real
`postgres:18-alpine` service container (same image as `docker-compose.yml`),
`cp .env.example .env` (values already match the service container's
credentials, so no secrets/templating needed for this non-sensitive
local-only Postgres), runs `prisma migrate deploy` (the non-interactive apply
command — see "Persistence"), then `npm run test:integration`. Deliberately
`push` only, no `pull_request` trigger: GitHub already surfaces a
push-triggered run against a branch's own HEAD commit as a check on any PR
containing that commit (matched by SHA), so a separate `pull_request` trigger
on the same commit would just run the workflow twice — real cost only in
noise/wait time even though public-repo Actions minutes are free. The
tradeoff being given up: `pull_request` tests GitHub's synthetic
merge-of-head-into-base commit, not just the branch's own HEAD, so it can
catch "these two branches individually pass but conflict/break once merged"
— not worth it yet for a solo-dev repo with no long-lived branches; revisit
if that changes. `HUSKY=0` at job level skips the Husky install step during
`npm ci`, since a CI runner has no git hooks to wire up. `permissions:
contents: read` at workflow level — least privilege for the default
`GITHUB_TOKEN`, since nothing in this workflow needs to write back to the
repo or call the GitHub API. Branch protection requiring this check to pass
before merging into `main` is a manual GitHub repo-settings step, not
something committed to this repo — not yet turned on.

**Environment variables** (`.env`, e.g. `DATABASE_URL`) are loaded via native
`--env-file` support, not the `dotenv` package or `@nestjs/config`: Nest CLI's
own `--env-file .env` flag for `start`/`start:dev` (`npx nest start --help`
lists it directly), and Node 22's own `--env-file=.env` flag for the compiled
`start:prod` path. Both were verified to actually populate `process.env` before
relying on them — `--env-file` is *not* usable via `NODE_OPTIONS` (Node
explicitly rejects it there), which is why it's passed as a direct CLI flag in
each npm script instead. No new dependency needed for 3-4 env vars; revisit
`@nestjs/config` only if real per-environment validation/schemas become
necessary.

**Known, deliberate gap (2026-08-08):** production secrets (`.env` on the
VPS) sit in a plaintext file — no encryption at rest, no access audit, no
rotation. Discussed explicitly: this is standard practice for a solo
operator with no second person holding server access and no real
paying-customer data yet, same "no infra before it's actually needed"
reasoning as Redis/BullMQ and the Unit-of-Work gap above — not an oversight.
The considered alternative is SOPS + age (secrets encrypted with one key,
the encrypted file committed to git for a real change history, decrypted
with a single CLI call at deploy) over Vault or a cloud secret manager,
specifically because it needs no service of its own to run/pay for and
doesn't reintroduce the cloud-provider lock-in the VPS choice was made to
avoid (see "Deployment" below). **Revisit when either**: (a) a second
person gets access to the production server, or (b) the app starts holding
real customer/payment data — not on a schedule, on one of those two
triggers.

`ValidationPipe` in `main.ts` sets `whitelist: true` **and** `forbidNonWhitelisted: true`
— unknown body fields get a `400` instead of being silently dropped. Deliberate:
we're pre-external-clients, so there's no forward-compat reason to tolerate stale
field names; a typo'd or outdated field (e.g. a client still sending `criteria`
after the `preferences` rename) should fail loudly, not silently produce a
profile with empty preferences.

**Swagger/OpenAPI** (`@nestjs/swagger` `^11`, matching Nest `^11`) is wired up in
`main.ts`'s `bootstrap()`, mounted at
`/product-backend-api/swagger` — namespaced by service name (not just `/api-docs`)
since the plan is more backend services down the line, each with its own API and
its own docs path. This is bootstrap/presentation-only concern, same tier as
`ValidationPipe` — no dedicated module needed for it. Every field on every DTO
(`CreateSearchProfileDto` and its nested classes) needs `@ApiProperty()` /
`@ApiPropertyOptional()` — class-validator decorators alone don't give Swagger
enough metadata, so a DTO field without one shows up as an empty/untyped entry in
the generated schema. When adding a new endpoint/DTO, annotate it the same way,
and add `@ApiOperation`/`@ApiResponse` on the controller method.

**Response DTOs are required too (decided + retrofitted 2026-08-17)** — every
`@ApiOkResponse`/`@ApiCreatedResponse` needs an explicit `type:` pointing at a
real response DTO class, the same way request DTOs need `@ApiProperty()` on
every field. Without a `type:`, `@nestjs/swagger` emits only the `description`
string with no `content`/`schema` at all — not a partial/untyped schema, no
schema whatsoever. This went unnoticed for months because nothing was
consuming the generated schemas programmatically; it surfaced the moment
`tests/e2e/mcp-openapi-server` tried to fetch a real response schema for
`POST /auth/telegram` and got back a bare `{ "description": "..." }`. Fixed
across every endpoint in one pass once found, not just the one that
surfaced it — response DTOs live in each module's `presentation/dto/`
alongside the request DTOs (`LoginResponseDto`, `SearchProfileResponseDto`
+ `SearchPreferencesResponseDto` for its nested VOs, `ListSearchProfilesAdminResponseDto`,
`UserResponseDto`, `ListUsersResponseDto`, `SetSearchProfileLimitResponseDto`).
Response DTOs carry `@ApiProperty()` only — no class-validator decorators
(`ValidationPipe` never runs against a response body) and no `ClassSerializerInterceptor`
is registered anywhere in this app, so adding `type:` is purely additive
Swagger metadata with zero runtime behavior change — verified by generating
the OpenAPI document in-process and diffing the `responses` node for a few
endpoints before/after, not just assumed. `@ApiNoContentResponse` (`204`)
endpoints are the one deliberate exception — a `204` has no body by HTTP
definition, so there's nothing for a `type:` to describe.

## Persistence

Local Postgres runs via `docker-compose.yml` (single `postgres:18-alpine`
service). In the real, gitignored `.env`, DB/user/password are all
`product.backend` — deliberately not `befirst`: "BeFirst" is the product
brand, this is the backend service's own identifier (same reasoning as the
Swagger path). Names with a dot were verified to work fine as real Postgres
identifiers and inside `postgresql://` URIs before committing to them.

`.env.example` (committed) deliberately does **not** mirror those values —
it uses the generic `postgres`/`postgres`/`postgres` (the universal Docker
Postgres placeholder convention) so `cp .env.example .env` works out of the
box with no edits, without baking our specific branded credential pattern
into a template file. The two are allowed to diverge on purpose: `.env`
reflects this project's actual local setup, `.env.example` just needs to be
a safe, functional starting point.

Prisma (`prisma/schema.prisma`) owns the schema and migrations
(`npm run prisma:migrate` / `prisma:generate` / `prisma:studio`). `preferences`
(the `SearchPreferences` VO) is stored as one `Json` column, not normalized
into per-VO tables — nothing queries into its sub-fields at the SQL level yet;
revisit only when a real query need appears (e.g. Matching Engine). Multi-word
columns/tables use `@map`/`@@map` to snake_case (`user_id`, `search_profiles`)
since that's the SQL-side convention, independent of our camelCase TS code.

We're on Prisma **7**, which changed some defaults from earlier versions —
verified directly rather than assumed, since docs/training data lag reality:
- The client generator (`provider = "prisma-client"`) emits plain `.ts` source
  into `generated/prisma/` (gitignored, prisma-managed), not pre-built JS into
  `node_modules` — importing it from `src/` will hit the same "not under
  `rootDir`" class of issue `tsconfig.build.json` already guards against.
  Switched back to `provider = "prisma-client-js"` instead, which still works
  in v7 and emits into `node_modules/@prisma/client` like every other
  dependency — no visible generated folder anywhere in the repo, no gitignore
  entry, no `rootDir` special-casing. Chosen deliberately over the new default:
  fewer moving parts for a single-package, single-generator project like this
  one.
- `datasource.url` now lives in `prisma.config.ts`, not `schema.prisma`.
  `prisma.config.ts` loads `.env` via Node's native `process.loadEnvFile()`,
  guarded by `existsSync('.env')` rather than try/catch (empty catch blocks are
  a smell even with a comment explaining them) — not the `dotenv` package
  Prisma's own scaffold assumes — consistent with how `.env` is loaded
  everywhere else in this project (see "Environment variables" above).
- `PrismaClient` now **requires** a driver adapter (`@prisma/adapter-pg` here)
  — a bare `DATABASE_URL` string constructor argument is no longer accepted.
  `pg` itself comes in transitively through the adapter; not a direct
  dependency of ours.

`PrismaService` (`src/common/persistence/PrismaService.ts`) extends
`PrismaClient` directly (the officially-documented Nest+Prisma pattern),
constructing the `PrismaPg` driver adapter itself and hooking `$connect`/
`$disconnect` into `OnModuleInit`/`OnModuleDestroy`. `PrismaModule` wraps and
exports it — deliberately not `@Global()`, kept explicit like every other
module wiring in this project; importing modules still get the same singleton
instance regardless, that's standard Nest DI, not something `@Global()` is
needed for.

Port implementations follow a `<Technology><PortName>Adapter` naming pattern —
`PrismaSearchProfileAdapter` (real Postgres, `infrastructure/persistence/`),
test doubles are `Fake<PortName>Repository` in `tests/unit/helpers/` (see
"Testing"). "Repository" is reserved for the port interface itself
(`SearchProfileRepository`); concrete implementations are always "Adapter" —
chosen deliberately over reusing "Repository" on the concrete class too, to
keep "the contract" and "an implementation of it" visually distinct at a
glance. `preferences` crosses the port boundary as `Prisma.InputJsonValue`; the
domain-side `SearchPreferencesProps` shape gets built as a plain object first,
then cast (`as unknown as Prisma.InputJsonValue`) — Prisma's generated `Json`
input type structurally requires an index signature that a concrete `interface`
never has, so some cast at that specific boundary is unavoidable, not a sign of
an unsafe shortcut elsewhere.

**The `<Technology><PortName>Adapter` pattern applies to every port, not just
`*Repository` ones** (decided 2026-08-06, prompted by `TokenIssuer` /
`JwtTokenIssuerAdapter` in the `auth` module): the reasoning — keeping "the
contract" and "an implementation of it" visually distinct — has nothing to
do with the port being a repository specifically, it applies equally to any
port with exactly one current concrete implementation. So `TokenIssuer`
(the port) is implemented by `JwtTokenIssuerAdapter` (not `JwtTokenIssuer`),
the same way `SearchProfileRepository` is implemented by
`PrismaSearchProfileAdapter`. Flagged in review after the class already
existed without the suffix — should have applied the existing rule by
analogy before implementing, not after.

Reading a row back goes through `SearchProfile.reconstitute()`
(`domain/SearchProfile.ts`), a second factory next to `create()` — `create()`
generates a fresh `id` and is where creation-time validation belongs;
`reconstitute()` takes a full, already-valid `SearchProfileProps` (including an
existing `id`) straight from a trusted source (our own Postgres row) and skips
re-deriving anything `create()` would compute. `SearchPreferences.create()` is
still run on the row's `preferences` JSON before handing it to
`reconstitute()`, since VO-level validation isn't re-derivable the way an `id`
is — a corrupted or hand-edited row should still fail loudly.

Row↔domain mapping for an adapter (`toDomain`, `toPersistenceJson`) always
lives in its own file, from the first such function — not "once there's more
than one," unlike the error-class threshold above. The two thresholds are
deliberately different: whether a *second* class will ever need the same
error is genuinely uncertain per error, but every adapter has a mapping
layer by the nature of the reconstitute-from-row pattern — the file's role
is established the moment the adapter exists, not once a second function
happens to join it. `PrismaSearchProfileAdapter` has two such functions
(`toDomain`, `toPersistenceJson`); `PrismaUserAdapter` currently has only
one (`toDomain` — `save()` builds its upsert payload inline, no nested VOs
to serialize) and still gets its own file. Both live in
`infrastructure/persistence/helpers/<name>MapperHelper.ts`,
named like the `tests/unit/helpers/*Helper.ts` convention (camelCase file,
ends in `Helper`) even though this one's in `src/`, not `tests/`: same
reasoning applies — it signals "supporting code for the thing next to it,"
not "the thing itself." The file exports a class instance
(`export const prismaSearchProfileMapper = new PrismaSearchProfileMapper()`),
not the class or `static` methods — deliberately, because the class holds no
state, so one shared instance is simpler to call (`prismaSearchProfileMapper.toDomain(row)`)
than either `new`-ing it at every call site or reaching for `static`. This
singleton-instance pattern is specifically for stateless mapper/utility
classes — it does not generalize to every helper: `FakeSearchProfileRepository`
in `tests/unit/helpers/`, for instance, must stay a class instantiated fresh
per test (`new FakeSearchProfileRepository()`), since it holds real
per-test state (`saved: SearchProfile[]`) that a shared instance would leak
across tests.

Migrations (`prisma/migrations/`) are committed to git like any other migration
tool's output (Rails, Django, Flyway, etc.) — they're the source of truth for
how the schema evolves, and `prisma migrate deploy` (the production-safe,
non-interactive apply command) reads them directly at deploy time. The
timestamp-prefixed folder names (`20260731151557_init`) are Prisma's own
convention, guaranteeing chronological ordering regardless of who generates a
migration or on which branch — not something to rename. The `-- CreateTable` /
`-- CreateIndex` comments inside `migration.sql` are also Prisma-generated;
migration files are historical records of what was actually applied, not
hand-curated source, so they're left as generated rather than edited for
terseness. `migration_lock.toml` (also committed) just pins the datasource
provider (`postgresql`) so a future accidental switch to a different database
can't silently mix incompatible migration SQL — same spirit as
`package-lock.json`, not something to question away.

`npx prisma init` also auto-installed an AI-agent skills bundle
(`.agents/skills/`, `.claude/skills/`, `.windsurf/skills/`, `skills-lock.json`)
— official Prisma reference docs, hash-verified, but a third-party content
bundle landing in the repo unasked is exactly the kind of thing the Security
section says to flag rather than silently keep. Removed by choice: rely on the
assistant's own knowledge instead of vendoring ~2200 lines of docs into the repo.

## Architectural priority

```
Business Domain → Application → Infrastructure → Presentation (HTTP)
```

We are building a domain model, not a NestJS application. NestJS is infrastructure.
The system must never be designed "from the controllers".

### Hard rules

1. Domain knows nothing about NestJS.
2. Domain knows nothing about Prisma.
3. Domain knows nothing about PostgreSQL.
4. Every external system (DOU, LinkedIn, Telegram, Redis) is an adapter. Domain
   doesn't know about them.
5. Search Profile stores the user's **intent**, not search logic. Translating
   preferences into requests for a specific source is the adapter's job.
6. Matching Engine is the only place that decides whether an Opportunity matches a
   Search Profile. It's a Domain Service — no side effects, no repository access
   from inside it.

## Security

Every implementation decision has a security angle, not just code that looks
like "auth" or "crypto" — a new dependency, a new HTTP-exposed endpoint, a new
input path, a new default config value all count. Weigh it before writing the
code, not as an afterthought pass at the end. "We have no auth yet" is not a
reason to skip this: an unauthenticated surface still leaks information and
still represents a conscious choice about what's exposed, not a non-decision.

**Validate with the user before implementing anything with a real security
angle** — a new public endpoint, a new dependency, a new default that changes
what's exposed or trusted — rather than deciding unilaterally and mentioning it
after the fact. Flag the tradeoff and the reasoning, let the user make the call.

Open items from the first audit (2026-07-31), kept here until acted on:
- Swagger UI + raw JSON/YAML spec (`/product-backend-api/swagger`, `-json`,
  `-yaml`) are public with no auth check — fine while nothing is deployed and
  nothing sensitive is modeled, but must be gated (env check or auth) before
  any real deployment.
- **Rate limiting, `helmet`, explicit CORS** — **closed 2026-08-08.** See
  "Deployment" below for the full shape.
- `@nestjs/swagger`'s `js-yaml` dependency has a known DoS advisory
  (GHSA-pm4m-ph32-ghv5) in its *parsing* path; we only call `jsyaml.dump()` on
  our own generated document (not reachable through this app as used), but
  re-check when `@nestjs/swagger` ships a fix upstream.
- **`GET /search-profiles?userId=...`** — **closed 2026-08-06.** The query
  param is gone; `POST /search-profiles` and `GET /search-profiles` now sit
  behind `JwtAuthGuard` and derive the caller's `userId` from the verified JWT
  (`@CurrentUser('id')`), not a client-supplied value. No enumeration surface
  left on these two endpoints.
- **`GET /search-profiles/:id`, `POST /:id/pause`, `/:id/activate`,
  `/:id/archive`, `PATCH /:id`** — **closed 2026-08-07.** Each of the five
  use cases (`GetSearchProfileUseCase`, `PauseSearchProfileUseCase`,
  `ActivateSearchProfileUseCase`, `ArchiveSearchProfileUseCase`,
  `UpdateSearchProfileUseCase`) now takes the caller's `userId` in its input
  (wired from `@CurrentUser('id')` in `SearchProfilesController`) and checks
  `searchProfile.userId !== input.userId` right after `findById()`, failing
  with the same `SearchProfileNotFoundError` as a genuinely-missing id — a
  mismatch and a nonexistent id are indistinguishable from the response, so
  there's no way to probe whether an id you don't own exists. Verified at
  every layer: unit tests per use case and on the controller (cross-user
  attempt → `NotFoundException`), integration tests per endpoint against
  real Postgres, and a manual live-server check (two distinct JWTs, one
  profile — owner gets `200`, the other user gets `404` on both read and
  write). No open item left in this section.

### Planned auth model (decided 2026-08-05, not built yet)

Product direction settled on Telegram as the only customer-facing channel
for the foreseeable future (no web/mobile app planned soon) — auth will be
Telegram-native, not generic email/password. Telegram already verifies the
caller's identity on every bot update (`message.from.id`), so there's no
separate credential system to build.

- **`User`** entity, keyed by `telegramUserId` (unique, verified by
  Telegram itself, not client-suppliable) — this becomes the real `userId`
  that `SearchProfile.userId` should reference, replacing today's bare
  client-supplied string.
- Two distinct trust boundaries, not one: the Telegram bot service is a
  trusted server-to-server caller (Telegram already authenticated the human
  on its end before the bot ever sees the update) vs. any other future
  client (a web dashboard, direct API access), which needs real end-user
  auth. For a future web case, the [Telegram Login
  Widget](https://core.telegram.org/widgets/login) provides the same
  `telegramUserId` identity cryptographically, so one identity model covers
  both channels without a second, parallel auth system.
- After identity is verified (via either path), issue a short-lived
  session/JWT; every `SearchProfilesController` endpoint validates it via a
  guard and derives `userId` server-side from it — never trusts a
  client-supplied `userId` or an implicit "you own this `id`" claim again.
  This is the actual planned fix for every open item above (`GET
  ?userId=...`, `pause`/`activate`/`archive`/`PATCH`), not a separate,
  unrelated task.
- Deliberately not building generic OAuth/email-password: no channel other
  than Telegram exists or is planned soon, and a multi-provider auth system
  now would be exactly the kind of "for a hypothetical future" work this
  project avoids elsewhere (see "What we are NOT doing right now"). Keep
  "verify identity" and "issue/validate a session" as two separate internal
  concerns regardless, so adding a second identity provider later (e.g.
  Sign in with Apple, if a real iOS app ever happens) is additive, not a
  rewrite.

**Known, deliberate gap (2026-08-05):** `User.create()` (`domain/User.ts`)
doesn't validate `telegramUserId` and returns a plain `User`, not a
`Result` — unlike `SearchProfile.create()`, which rejects a blank `name` via
`Result.fail`. Not an oversight: `User.create()` currently has no real
caller at all (only tests construct a `User`), so there's nothing yet to
defend against, same reasoning as not adding empty modules/DTOs "just in
case." **Decide this — not before —** when the Telegram-auth use case
(verify Login Widget `hash` → find/create `User`) is actually implemented:
by that point `telegramUserId` will already have passed Telegram's own
HMAC verification before ever reaching `User.create()`, same shape as the
already-documented `SearchPreferences.create(null)` asymmetry — so the real
question to answer then is whether that upstream guarantee makes
domain-level validation redundant, not just whether to add it by default.

**JWT expiry (decided 2026-08-06):** `AuthModule`'s `JwtModule.register()`
sets `expiresIn: '30d'`. This is a real security-vs-simplicity tradeoff, not
a default that should have been picked silently — flagged in review after
the fact, should have been raised before implementing per this section's
own rule. Reasoning kept here so it isn't re-litigated from scratch later:
30 days is long by strict token-hygiene standards (a leaked token stays
usable for a month), but there's no refresh-token flow built yet, and the
bot channel specifically has no natural "user re-authenticates" event the
way a web login does — a short expiry without refresh tokens would just
mean silently losing access with no clear trigger to fix it. Accepted as an
MVP simplification. **Revisit when either**: (a) refresh tokens get built
(short-lived access token + long-lived refresh token, the standard
pattern), or (b) real usage surfaces token-leak risk as a live concern —
not on a schedule, on one of those two triggers.

## Deployment (decided 2026-08-05, VPS provisioning done 2026-08-15)

A fixed-cost VPS/dedicated host (e.g. Hetzner, DigitalOcean), not
AWS/GCP/Azure, for the initial deployment — driven by cost predictability,
not performance. On a prepaid VPS, the worst case from abuse (spam, a
runaway crawler, a traffic spike) is the service falling over — bad, but
financially bounded to what was already paid. On pay-as-you-go cloud
providers, several commonly-used services (RDS storage auto-scaling, egress
traffic, log ingestion) have no cost ceiling by default, and a single abuse
pattern can generate an unexpectedly large bill before anyone notices — a
real risk for a bootstrapped, pre-revenue solo project, not a hypothetical
one. Revisit once there's paying-customer revenue and traffic patterns
predictable enough to justify autoscaling's operational complexity — not
before.

Hosting choice alone protects the wallet, not uptime — rate limiting is
what protects the VPS itself from falling over under abuse; the two are
complementary, not either/or.

### VPS provisioning (2026-08-15)

**Provider: Spaceship (Starlight Virtual Machines)** — checked live
pricing directly against the fixed-cost-VPS goal above before deciding,
rather than assuming from memory.
- **Region: US**, not Singapore (Spaceship's only other option) — closer
  to Europe/Ukraine over the transatlantic route than the Asia-Pacific one.
- **Plan: Standard 2** (2 vCPU / 4 GiB RAM / 60 GiB NVMe SSD / 2 TiB
  transfer, $11.90/mo) — sized to run `postgres` + `app` + `caddy`
  together on one instance; 2 TiB of transfer is far more than an
  early-stage API needs, not a real constraint.
- **Server hardening**: a non-root `deploy` user (in the `sudo` group) is
  the only way in day-to-day — root SSH login and password authentication
  are both disabled (`PermitRootLogin no`, `PasswordAuthentication no` in
  `/etc/ssh/sshd_config.d/00-custom.conf`, the file Spaceship's own
  provisioning actually controls — confirmed by checking which drop-in
  config wins before editing, since three separate files in
  `sshd_config.d/` disagreed on these settings). SSH itself runs on a
  non-default port (`22022`, Spaceship's own convention, not something we
  chose). `ufw` allows only `22022`, `80`, `443`, default-denies
  everything else inbound.
- **Domain: `befirstapp.com`** (`befirst.com`/`.app`/`.io`/`.tech`/`.com.im`
  etc. were all already taken by others) — bought through Spaceship
  alongside the VPS, DNS pointed at the server (`@` A record, `www`
  CNAME to the root domain).
- **Spaceship AutoBackup enabled** (whole-disk snapshot, 5-day rolling
  retention, ~$2.38/mo) — a cheap supplementary safety net, explicitly
  **not** a substitute for the planned `pg_dump`-to-S3-compatible-storage
  backup (see "Known, deliberate gap" below, still open): a disk snapshot
  isn't a clean logical dump of just the database, and it's tied to this
  one provider, not portable if the VPS ever moves.

### Deployment readiness: rate limiting, `helmet`, CORS (2026-08-08)

`@nestjs/throttler` is wired globally via `APP_GUARD` in `AppModule`, two
named throttlers registered in `ThrottlerModule.forRoot()`: `default` (IP
tracked, 60 req/min, applies to every route) and `perAccount` (same IP-based
defaults everywhere by design — a no-op duplicate of `default` on most
routes — except on `POST /auth/telegram`, where it's overridden to 5
req/min tracked by the target `telegramUserId`, not IP). Both layers apply
simultaneously to the login route: `default` catches one IP flooding the
endpoint regardless of which account it claims to be; `perAccount` catches
credential-stuffing one specific account from many different IPs — an
attacker can't evade both by rotating either axis alone. Discussed and
chosen deliberately over a single IP-only limit, which would miss the
per-account brute-force case, and over a per-route `@SkipThrottle()` on
every other controller, which would need remembering on every future
controller. Limit/TTL values live in `common/rateLimiting/throttleLimits.ts`
(named constants, not magic numbers, since they're genuinely cross-cutting —
used from both `AppModule` and `AuthController`). Verified live (curl loop
hitting `/auth/telegram` past both limits) and covered by an integration
test using an isolated app instance (throttler storage is in-memory per
process, so it can't share state with the file's other tests).

**Trust proxy — a real bug caught in review, fixed (2026-08-09):** the
verification above ("curl loop hitting `/auth/telegram`") was run against
the bare app, before Caddy existed in this same PR — it couldn't have
caught this. `@nestjs/throttler`'s default tracker (and `perAccount`'s IP
fallback) both read `req.ip`, which Express only resolves from
`X-Forwarded-For` if `trust proxy` is explicitly configured. Without it,
Express reads the raw socket address — and since only Caddy can reach
`app` on the compose network, *every* real client looks like Caddy's own
container IP. That collapses `default`'s per-IP bucket into one bucket
shared by the whole service (real users start 429-ing each other), and an
attacker gets a free pass — no IP rotation needed, every request already
looks like it's from the same source. Fixed with `app.set('trust proxy', 1)`
in `configureApp.ts` (new file) — `1`, not `true` or Nest's own docs
example (`'loopback'`), because the real topology is exactly one hop
(Caddy) between the internet and this app; a numeric hop-count says that
precisely, an IP-range preset would be guessing. `configureApp()` is a
single function called from both `main.ts` and every integration spec that
boots a real app — previously each spec duplicated the `ValidationPipe`
setup inline and never applied `helmet`/CORS/trust-proxy at all, which is
exactly why no existing test caught this. A regression test was added
(two requests with different `X-Forwarded-For` values must land in
independent `default` buckets) and verified against a false positive:
temporarily reverted the `trust proxy` line, confirmed the test actually
fails (second simulated IP inherits the first's usage), restored the fix,
confirmed it passes.

**`perAccount`'s tracker reads the request body before `ValidationPipe`
runs**, so an attacker who doesn't care about one specific account can
send a fresh random `id` on every request, giving each one its own
untouched `perAccount` bucket. Not a new gap layered on top of the
trust-proxy bug above — it's `perAccount`'s always-intended shape (catches
targeted single-account brute force; general flood is `default`'s job, not
this throttler's) — but the two findings compound: without a working
`default`, *nothing* caught the "flood with random ids" pattern, since
`perAccount` was never meant to and `default` couldn't see real IPs to
catch it either. Fixing trust proxy closes this in practice, not just in
theory — `default` now sees the real, single attacking IP regardless of
how many fake `id`s it cycles through.

**Known, deliberate gap (2026-08-09):** throttle counters live in
`@nestjs/throttler`'s default in-memory storage — fine for the current
single-`app`-instance `docker-compose.yml`, but if `app` is ever
horizontally scaled, each instance counts independently and the real
effective limit multiplies by instance count. Same "no Redis before it's
actually needed" reasoning as everywhere else in this file — revisit
specifically when a second `app` instance is ever introduced, moving
throttle storage to whichever of Postgres/Redis is already in use by then.

`helmet()` is applied in `main.ts`. CORS is explicitly disabled
(`app.enableCors({ origin: false })`) rather than left unconfigured — no
browser-based client exists or is planned soon (the Telegram bot is a
server-to-server caller, not a browser; see "Planned auth model"). Revisit
when a Telegram Mini App or web dashboard actually needs cross-origin
access, and allowlist that specific origin then. Verified `helmet`'s
default CSP doesn't break Swagger UI (headless Chromium render — the
operation list, including `/search-profiles` and `/auth/telegram`, renders
fully, no CSP violations) before considering this closed, since Swagger
staying browsable is a deliberate product decision (see Roadmap step 3
below), not something that could be silently broken by a security header.

### Deployment shape: Docker + Caddy (2026-08-08)

`Dockerfile` is a multi-stage build (`node:22-alpine`): a `build` stage runs
the full `npm ci` + `nest build`, a `production` stage runs
`npm ci --omit=dev` and copies only the compiled `dist/`. Both `npm ci`
calls use `--ignore-scripts` followed by an explicit `npx prisma generate`
— a Docker build context has no `.git` dir, so the `prepare` script's
`husky` step fails outright, and in the production stage `husky` (a
devDependency) isn't even installed to begin with; skipping lifecycle
scripts and calling `prisma generate` ourselves is more predictable than
relying on npm's implicit hook. Verified end-to-end against the real local
Postgres container: built the image, ran it via `docker compose up -d app`,
exercised a real `POST /auth/telegram` login through the container network,
confirmed the row landed in Postgres. Final image is ~1GB (mostly the
`npm ci --omit=dev` layer) — not optimized further yet, not a blocker for a
VPS with normal disk headroom; revisit if it ever actually matters.

`docker-compose.yml` gained two services alongside the existing `postgres`:
`app` (built from the `Dockerfile`, `.env` mounted read-only for the
secrets that don't differ by execution context) and `caddy` (official
`caddy:2-alpine` image, reverse-proxying to `app`, automatic Let's Encrypt
TLS). `app`'s `DATABASE_URL` is overridden via a plain `environment:` entry
in the compose file (pointing at the `postgres` service name instead of the
`.env` file's `localhost`) — Node's `--env-file` only fills in variables
not already set in the process environment, so this override wins without
needing a second `.env` file or any code change. `app`'s port is `expose`d,
not `ports`-published — only `caddy` (same compose network) can reach it;
nothing but 80/443 is meant to be open on the VPS itself. `app` has a
`healthcheck` (`wget --spider http://localhost:3000/health`, same
interval/timeout/retries as `postgres`'s) hitting a new, unauthenticated
`GET /health` (`common/health/HealthController.ts`) — `caddy`'s
`depends_on` now waits on `condition: service_healthy` the same way `app`
already waits on `postgres`, instead of only waiting for the container to
start (which doesn't mean the port is actually accepting connections yet).
Caught in review as an asymmetry with the `postgres`/`app` pair; not
previously broken in practice since Caddy's `reverse_proxy` retries failed
upstream connections on its own, but this closes the gap for real instead
of relying on that retry behavior.

**`postgres`'s published port is bound to loopback only** (`127.0.0.1:${POSTGRES_PORT:-5432}:5432`,
not a bare `5432:5432`) — caught during the first real VPS deploy, before
this shipped. Docker manages its own iptables rules for published ports,
which can bypass `ufw` even when the firewall shows the port as denied —
a bare host-port publish would risk exposing Postgres to the whole
internet on a real server regardless of the firewall config, something
that didn't matter for local dev (where "the internet" isn't a concern)
but is a real gap on a public VPS. `app` never needed this publish at
all — it reaches `postgres` over the internal compose network by service
name; the loopback binding exists purely so host-level tools (Prisma
Studio, a local `psql`) can still reach it, both locally and by SSHing
into the VPS itself.

**Known, deliberate coupling (2026-08-15): `postgres` is co-located with
`app` in this one `docker-compose.yml`, not designed for a separate or
managed database.** Flagged during the first real VPS deploy, before any
decision to actually move the database exists — recorded now so it's
decided as one piece later, not discovered one broken assumption at a
time. Three things are implicitly tied to "Postgres is a sibling
container on the same VPS" today, and all three change together the
moment that stops being true (Postgres moves to its own host, or to a
managed provider — RDS, Neon, Crunchy, Supabase, etc.):
- **`DATABASE_URL`'s host.** Hardcoded to the compose-network service name
  `postgres` (`app`'s `environment:` override above) — meaningless once
  the database isn't a sibling container. There's no mechanism today for
  "local compose runs its own Postgres, production compose points at an
  external one" to diverge — no override file, no second compose file.
  Needs one before the migration, not after.
- **Encryption in transit.** `DATABASE_URL` sets no `sslmode`. Fine today
  — traffic between `app` and `postgres` never leaves the Docker bridge
  network, it's local to the VPS. The moment the database is a separate
  host (even one on the same provider's "internal" network), that traffic
  crosses a real network link, and an unencrypted connection stops being
  theoretical. `sslmode=require` at minimum (`verify-full` with a CA cert,
  if the provider supports it) needs deciding at that point, not left
  implicit the way it is now.
- **Network-level access control to the database.** The `127.0.0.1`
  loopback bind just above is specific to "Postgres is a container on
  this exact VPS" — it stops applying entirely once the database is
  elsewhere. A managed provider needs its own equivalent (IP-allowlisting
  the `app` server specifically, not a password-only connection open to
  the internet), configured on the provider's side — a wholly different
  surface than anything in this `docker-compose.yml`.

Not a blocker now — no decision to move the database off this VPS exists,
and building for that before it's real would be guessing. **Revisit all
three together, as one decision, the moment a DB migration off this VPS
is actually being planned** — not piecemeal, since e.g. adding
`sslmode=require` only matters once the host stops being `postgres` on
the same compose network in the first place.

`Caddyfile` points at the real domain, **`befirstapp.com`** (bought
2026-08-15, both root and `www` — DNS: `@` A record → the VPS IP, `www`
CNAME → the root domain), registered via Spaceship alongside the VPS
itself. **Verified live (2026-08-16):** `caddy` started on the VPS,
obtained a real Let's Encrypt certificate, and `https://befirstapp.com`
serves the app end-to-end (`GET /health`, the Swagger UI) with no browser
TLS warning — the full stack (`postgres` + `app` + `caddy`) is live.

**Deploy trigger stays manual, not continuous-on-push** (decided
2026-08-08, automated 2026-08-23) — `.github/workflows/deploy.yml` SSHes
into the VPS (`appleboy/ssh-action`, pinned to `v1.2.5`, not a floating
tag) and runs the same steps previously done by hand: `git pull`,
`docker compose up -d --build app` (scoped to `app` only — `postgres`/
`caddy` have no `build:` of their own), then `docker compose exec -T app
npx prisma migrate deploy` — added as an unconditional step even though
the prior manual routine sometimes skipped it, since it's a no-op when
there's nothing pending and closes a real "shipped code expecting a
schema migration that never ran" class of bug for free. Triggered via
`workflow_dispatch` — a manual "Run workflow" button in the GitHub
Actions UI — deliberately not on every push to `main` the way the
integration-tests workflow is. Revisit only if manual triggering becomes
a real friction point, not by default. The SSH private key lives in the
`DEPLOY_SSH_KEY` repository secret, paired with a dedicated deploy
keypair (not anyone's personal key) added to `~deploy/.ssh/authorized_keys`
on the VPS. Host/port/user (`befirstapp.com`/`22022`/`deploy`) aren't
secret — already public in this file — so they're inlined directly in
the workflow, not duplicated into secrets that would just need to match.

**Known, deliberate gap (2026-08-16): redeploy causes a brief downtime,
not zero-downtime.** `docker compose up -d --build` builds the new `app`
image without touching the running container, then recreates only `app`
(`postgres` and `caddy` keep running) — but between "old `app` stopped"
and "new `app` passes its healthcheck," Caddy has nowhere to proxy to and
returns `502`/`504` for a few seconds. Not fixed now, on purpose: there
are no real users yet to be affected by it, and the actual fix (blue-green
— start a second `app` container alongside the first, wait for its
healthcheck, only then point Caddy at it and stop the old one) is real
added complexity (two `app` instances live at once, coordinating the
switch, deciding what happens if the new one never turns healthy) that
isn't worth building against traffic that doesn't exist yet — same
reasoning as every other "not before it's needed" gap in this file.
**Revisit once there are real users who could be affected by a live
deploy** — not on a schedule, on that trigger. Planned shape when it's
time: Caddy already supports proxying to multiple upstreams, so the likely
implementation is two `app` services in `docker-compose.yml`
(`app-blue`/`app-green`) and a deploy script that builds+starts the idle
one, polls its `/health`, and only then rewrites `Caddyfile`'s
`reverse_proxy` target and reloads Caddy — no new tooling/orchestrator
needed for a single-VPS setup this size.

**Known, deliberate gap (2026-08-09, VPS chosen 2026-08-15, still open): no
logical Postgres backups yet.** Discussed explicitly, not an oversight —
the VPS itself is now provisioned (see "VPS provisioning" above), but
closing this still needs an object-storage destination chosen (a `pg_dump`
cron sidecar in `docker-compose.yml` compressing and shipping to
S3-compatible storage, not AWS S3, same non-AWS cost-predictability
reasoning as the VPS choice itself — is the planned shape), and building
the upload/restore path against a destination that doesn't exist yet would
be untested, false-confidence code, worse than an honestly-tracked gap.
Spaceship's AutoBackup (see "VPS provisioning" above) is enabled in the
meantime as a supplementary whole-disk safety net, not a substitute — it's
not a clean logical dump and isn't portable off this one provider.
**Revisit as part of the first real deploy** — object-storage selection and
initial backup wiring happen together, not backups deferred indefinitely
after going live. Longer-term direction (not needed yet): WAL archiving
via pgBackRest/WAL-G for point-in-time recovery once transaction
volume/criticality justifies the added complexity over daily `pg_dump`
snapshots, plus periodic automated restore verification and at-rest
encryption once real customer data is involved.

## Project structure: feature-first (by bounded context)

```
src/
  modules/
    searchProfile/        { domain, application, infrastructure, presentation }
    source/
    opportunity/
    matching/
    notification/
    opportunityInteraction/
  common/
    kernel/                Result, DomainError — base building blocks every
                            module's domain layer depends on (later: Entity,
                            ValueObject, AggregateRoot base classes)
```

`common/` is the shared-kernel package: cross-cutting code with no home in a
single bounded context. Organize it by meaning as it grows (e.g. a future
`common/valueObjects/` for Value Objects genuinely reused across modules) —
never let it become a flat dumping ground. Named `common/`, not `shared/`, to
match team preference; be aware it reads next to `@nestjs/common` in imports,
so don't shorten import aliases in a way that blurs the two.

Inside a module, only create the layer subfolders that actually contain files —
don't add an empty `infrastructure/` just for symmetry.

**Current status:** only `searchProfile` is implemented/in progress (Walking
Skeleton). The other modules are agreed-upon boundaries, no files yet.

Ports (repository/adapter interfaces) live in `application/<module>/ports/`,
implementations live in `infrastructure/<module>/`.

**This file stays a single root `CLAUDE.md`, not split per-directory, until
there's a real reason to** — same "not before it's needed" reasoning as
Redis/BullMQ above. Splitting now would just scatter today's cross-cutting
sections (naming, testing tiers, security) across files that would all need
to reference each other anyway, since there's only one real module so far.
Revisit once either holds: (a) a second module (`source`, `opportunity`, ...)
exists with genuinely divergent local conventions (e.g. `source`'s
DOU-parsing adapters needing their own rules), or (b) this root file gets
big/noisy enough that someone working in one narrow area (e.g. only
`tests/`) has to wade through unrelated product/domain sections to find what
they need.

## Domain

### Entities

- **User** — system user, identified by `telegramUserId` once auth exists
  (see "Planned auth model" under Security). Can have multiple Search
  Profiles, but see the free-tier limit below.
- **SearchProfile** — the user's intent. Fields: `id, userId, name, description,
  status, preferences, createdAt, updatedAt, lastMatchedAt`.
- **Opportunity** — normalized, source-independent possibility. Fields:
  `id, sourceId, externalId, title, description, company, url, country, city, remote,
  relocation, salary, skills, seniority, employmentType, publishedAt, updatedAtSource,
  detectedAt, lastCheckedAt, status, contentHash, rawPayload`. Change history will be
  a future `OpportunityHistory` entity (no full Event Sourcing yet).
- **Match** — links SearchProfile + Opportunity. Produced by the Matching Engine.
  Exists independently, gives rise to Notification.
- **Notification** — a fact of delivery, not a message. Channels (Telegram, etc.)
  come later.
- **Source** — a data source (DOU, LinkedIn...). Minimal entity for now, will later
  own pricing/subscriptions.
- **OpportunityInteraction** *(introduced during brainstorming, not in the original
  spec)* — a specific user's state with respect to a specific Opportunity
  (`userId, opportunityId, status: opened|saved|applied|dismissed`). This is a
  separate aggregate, not fields on `Opportunity` — otherwise "applied" would be
  shared across all users.

**Monetization limit (implemented 2026-08-07):** each `User` has a
`searchProfileLimit: number` field (`@default(1)` in Postgres, set the same
way in `User.create()`) — `CreateSearchProfileUseCase` counts that user's
**active + paused** `SearchProfile`s (not `archived` — an archived profile
doesn't count against the limit, so archiving one always frees up a slot)
and fails with `SearchProfileLimitExceededError` (→ `400`, same bucket as
every other "current state doesn't allow this" failure, e.g.
`InvalidSearchProfileStatusTransitionError`) once the count reaches the
limit. No subscription/payment concept exists yet — there's no automated
way for a user to raise their own limit — but the field and the enforcement
are real and tested (unit + integration). Longer-term direction, still not
decided in detail: the free tier might become 2 profiles with paid tiers
unlocking more, once real pricing is worked out — "1 for free" was
deliberately the simplest possible default to build against first, not a
final decision; changing it later is a one-line default change plus a
backfill migration for existing rows, not a redesign.

**Known, deliberate gap (2026-08-07):** the active/paused count and the
subsequent `save()` in `CreateSearchProfileUseCase` are two separate,
unsynchronized repository calls — not wrapped in a transaction or backed
by any DB-level lock. Two concurrent `POST /search-profiles` requests from
the same user (a double-click, a client retrying after a slow response)
could both read the same pre-insert count and both pass the limit check
before either one's insert lands, briefly exceeding the limit. Low
severity: self-healing (the very next `create()` call re-checks the real
count and blocks), no data corruption, no security exposure — and closing
it correctly needs a real Unit-of-Work/transaction primitive that doesn't
exist anywhere in this codebase yet (every repository port call is
independent; nothing currently threads one Prisma transaction across two
adapters), not a one-line fix. Deliberately not fixed immediately when
found — flagged in review, discussed, and explicitly scheduled instead:
**Roadmap step 5**, after E2E tests and before DOU, so it lands before DOU
brings real (possibly automated/bursty) write traffic into the picture.

**Admin override mechanism (decided + implemented 2026-08-07):** `User`
gained a `role: 'user' | 'admin'` field (`@default(user)`). A new
`AdminGuard` (`modules/user/presentation/AdminGuard.ts`) checks the live
`role` of the authenticated caller (re-fetched from Postgres on every
request, not embedded in the JWT — a 30-day-lived token must not carry
30-day-stale admin rights) and gates a new admin-only endpoint,
`PATCH /users/:id/search-profile-limit`
(`SetSearchProfileLimitUseCase` → `User.setSearchProfileLimit()`, which
validates `limit` is a non-negative integer — `0` is a legal value,
deliberately: the same lever that raises a paying customer's limit also
works as an abuse kill-switch, no separate "ban user" feature needed).
Chosen over an env-var allowlist of admin `telegramUserId`s specifically
because it reuses the existing Telegram-native identity system rather than
adding a second, parallel one — the explicit goal (stated when this was
scoped) was a mechanism that generalizes/automates later, and "flip a role
column" is the shape a future payment webhook would also use to grant
access, not a manual-only dead end.
- **Bootstrapping the first admin** is deliberately *not* a built endpoint
  — with exactly one operator (the person running this service) needed for
  the foreseeable future, promoting that one row (`UPDATE users SET role =
  'admin' WHERE id = '...'`, or the same edit via `npm run prisma:studio`)
  costs nothing and doesn't justify a privileged "bootstrap" HTTP surface
  that would itself need securing. Revisit only if a second, distinct
  support operator is ever needed and hand-editing Postgres per new admin
  stops being acceptable.
- **`UserModule` ⇄ `AuthModule` circular import**, resolved with
  `forwardRef()` on both sides: `AuthModule` already needed `UserModule`
  (to look up/create a `User` during Telegram login), and now `UserModule`
  needs `AuthModule`'s `JwtAuthGuard` (`UsersController` requires a valid
  bearer token before `AdminGuard` even runs). This is the first genuine
  case of two modules mutually depending on each other in this codebase —
  `forwardRef()` is Nest's own first-class, documented answer to exactly
  this shape, chosen over restructuring `JwtAuthGuard`/`CurrentUser` into
  `common/` (which would avoid the cycle entirely) because that would touch
  already-shipped, already-tested code across multiple modules for a
  problem `forwardRef()` already solves in two lines — revisit the
  `common/` move only if a *third* module hits the same cycle and the
  pattern starts feeling structural rather than incidental.
- **`User.create()` validation gap, revisited and left as-is:** the
  "Known, deliberate gap" below asks to reconsider `User.create()`'s lack
  of `Result`-based validation once a real caller with untrusted input
  exists. `User.setSearchProfileLimit()` is that trigger for *this* field —
  it now validates (`Result.fail(InvalidSearchProfileLimitError)`) because
  admin-supplied `limit` is genuinely untrusted HTTP input. `User.create()`
  itself still isn't Result-based: its only caller remains
  `LoginWithTelegramUseCase`, where `telegramUserId` has already passed
  Telegram's own HMAC verification before reaching it — same reasoning as
  before, unchanged by this feature.

**Self-service account deletion (decided + implemented 2026-08-16, admin
override added same day):** `DELETE /users/:id` (`DeleteUserUseCase`) lets
a user delete their own account — guarded by `JwtAuthGuard` only, no
`AdminGuard`, so it moved out from under `UsersController`'s former
controller-level `@UseGuards(JwtAuthGuard, AdminGuard)`; `AdminGuard` now
sits on `setSearchProfileLimit` alone. Ownership is checked the same way
as every `SearchProfile` endpoint (see Security → the five closed
enumeration items): the path `:id` must match the caller's own id from
the JWT, and a mismatch fails with the same `UserNotFoundError` (→ `404`)
as a genuinely nonexistent id — no separate `403`, so there's nothing to
distinguish "not yours" from "doesn't exist." **Admin override**: if the
caller isn't the target's owner, `DeleteUserUseCase` asks the shared
`UserAccessService.isOwnerOrAdmin()` (see "Admin access to Search
Profiles and Users" below — extracted the same day once this exact
owner-or-admin check needed repeating across several more use cases) —
same `UserNotFoundError`/`404` for a non-owning, non-admin caller either
way, same reasoning as above (no enumeration signal from the response). Chosen
deliberately over the alternative (self-service removed entirely, users
email/contact an admin to request deletion): that alternative adds real
friction with no offsetting benefit, and breaks the e2e-cleanup
prerequisite this endpoint was specifically built for; the admin path is
additive, not a replacement — same "self-service escape-hatch" shape as
the `searchProfileLimit` admin override already documented above (the
lever a paying customer uses themselves also works as a moderation/abuse
tool for an admin). Checked directly in the use case rather than via a
second guard, so the controller-level guard config stays simple
(`JwtAuthGuard` only) and the business rule ("owner or admin") lives in
one place next to the deletion logic it gates. Deleting a user cascades to
all of their `SearchProfile`s
(`SearchProfileRepository.deleteAllByUserId`, added alongside
`UserRepository.deleteById`) — profiles are deleted first, the `User` row
second. Same "no Unit-of-Work yet" limitation as the free-tier-limit race
above — two unsynchronized repository calls, not one transaction, because
no primitive exists yet to do better — but a different failure shape, and
the crash-vs-race order tradeoff is worth spelling out rather than just
citing the same gap twice:
- **Crash between the two calls** (process dies, e.g. OOM, a deploy
  restart — not a race, just an interrupted sequence): with profiles-first
  (current order), the account survives with zero profiles — completely
  benign, indistinguishable from a user who never created one. Reversed
  (`User` row first), any profiles that already existed are orphaned
  *deterministically* — not a probability, guaranteed on every crash that
  lands in that window.
- **Concurrent `POST /search-profiles` from the same account racing the
  deletion** (found in review, 2026-08-16): with profiles-first, a request
  whose `CreateSearchProfileUseCase.findById(userId)` ownership check
  passes *before* `deleteAllByUserId` runs, but whose insert lands
  *after* it, creates one profile that then survives `deleteById` —
  permanently orphaned, since no future call can ever reach it again (a
  fresh Telegram login creates a brand-new `User` with a new random
  `id`, so nothing will ever match the old, deleted one). Unlike the
  free-tier-limit race, **this one doesn't self-heal** — there's no "next
  call re-checks reality" for a user that no longer exists to make one.
  Reversed order would close this specific race (the trailing
  `deleteAllByUserId` would catch a late insert on its way out) at the
  cost of reintroducing the deterministic crash-orphan case above.

Kept profiles-first anyway: an interrupted-crash mid-deletion is judged
more likely in practice than the same account racing itself across two
endpoints in a millisecond window, and profiles-first is the only order
where the *common* failure mode (crash) stays fully benign — the residual
risk (concurrent-create race) is strictly narrower (needs precise timing)
and its blast radius is smaller (one inert orphan row, not "guaranteed
orphan every crash"). Not fixed now for the same reason as the free-tier
race: real severity is low (no security exposure, no data corruption of
other users' data, just an unreachable row) and closing it properly needs
the same Unit-of-Work primitive **Roadmap step 5** already schedules — one
real transaction would fix both gaps at once, so there's no reason to
build a narrower, one-off fix for this specific case first.

Motivated by two things at once, not built solely for either: a genuine
self-service data-deletion feature, and the prerequisite the e2e-testing
Roadmap step already called for (see Roadmap step 4 — test run cleanup
needed a real API-callable deletion path, since GitHub Actions runners
can't reach the VPS's Postgres directly).
- **`UserModule` ⇄ `SearchProfileModule` circular import**, resolved with
  `forwardRef()` on both sides, same shape as the `UserModule` ⇄
  `AuthModule` cycle documented above: `SearchProfileModule` already
  imported `UserModule` (for the free-tier limit check), and now
  `UserModule` needs `SearchProfileModule`'s `SearchProfileRepository`
  (newly exported from `SearchProfileModule` for this). This is a second,
  *different* module pair hitting the same shape — not a third module
  joining the existing `AuthModule` ⇄ `UserModule` cycle — so the
  "revisit only if a third module hits the same cycle" note above still
  hasn't fired; noting it here so the count is easy to find later if a
  third pair shows up.

**Admin access to Search Profiles and Users (decided + implemented
2026-08-16):** prompted by a real gap noticed after `DELETE /users/:id`
shipped — an admin could delete a whole account but had no way to read,
moderate, or manage an individual `SearchProfile` through the API at
all, only by hand-editing Postgres via Prisma Studio. Closed with a
matching pair of decisions, not built ad hoc per endpoint:
- **`UserAccessService`** (`modules/user/application/UserAccessService.ts`)
  — `isAdmin(userId)` and `isOwnerOrAdmin(resourceOwnerId, callerId)`,
  wrapping `UserRepository`. Extracted once the inline
  `caller.role !== 'admin'` check (originally written directly inside
  `DeleteUserUseCase`) was about to be copy-pasted into four more use
  cases (`GetSearchProfileUseCase`, `UpdateSearchProfileUseCase`,
  `DeleteSearchProfileUseCase`, plus `DeleteUserUseCase` itself) — past
  the point where "three similar lines" stays simpler than a shared
  helper. Deliberately *not* a port (no interface + adapter): it's not
  swappable infrastructure, it's application-layer business logic reusing
  the already-existing `UserRepository` port, so a single injectable
  class is the right amount of ceremony. Considered and rejected: a full
  ABAC library (CASL is the standard NestJS-ecosystem choice) — right
  tool once the permission model grows past a single binary "owner or
  admin" rule across a couple of resource types, but real added
  complexity/dependency weight for what is, today, one rule reused in a
  handful of places. Revisit if a third role (e.g. moderator) or
  resource-scoped permissions beyond "own it or be admin" become real.
- **Every extended check reuses the exact 404-not-403 pattern** already
  established for ownership (see Security → the five closed enumeration
  items, and the `DELETE /users/:id` entry above): a non-owning,
  non-admin caller gets the same "not found" as a genuinely nonexistent
  id, so the response never signals whether a resource exists to someone
  who isn't allowed to see it.

What changed, concretely:
- `GET /users` — a **new, admin-only** endpoint (`ListUsersUseCase`),
  paginated, with an optional `?telegramUsername=` filter matched against
  `telegramUsername` (case-insensitive `contains`) — named `search`
  originally, renamed 2026-08-23 once a review caught that a generic
  "search" name didn't say what it actually filters on, unlike every
  other query param in this codebase. Chosen as the one
  searchable field deliberately: `telegramUserId` and `id` are both
  opaque identifiers an admin would already have to look up from
  somewhere else to type in (defeating the point of a search box), while
  `telegramUsername` is the one human-recognizable field on `User` —
  the thing an admin actually has in hand when a support conversation
  starts ("user @oleh_dev says..."). This is also the prerequisite for
  every other admin action in this section: `GET /search-profiles/admin`,
  `PATCH /users/:id/search-profile-limit`, and `DELETE /users/:id` all
  need a `userId` the admin already has — before this endpoint existed,
  the only way to find one was Prisma Studio.
- `GET /search-profiles/:id` and `PATCH /search-profiles/:id` — same
  routes, extended in place (no new endpoint) from "owner only" to
  "owner or admin" via `UserAccessService`. Their use case inputs'
  `userId` field was renamed to `callerId` throughout (`GetSearchProfileInput`,
  `UpdateSearchProfileInput`) to make the "this is the caller, not
  necessarily the resource owner" distinction explicit at the type level
  — matching `DeleteUserUseCase`'s existing `callerId` naming.
- `DELETE /search-profiles/:id` is a genuinely **new** endpoint — no
  self-service hard-delete of a single profile existed before this
  (`archive` was, and remains, the self-service soft-delete: a status
  transition, not a row removal). Built self-service-plus-admin-override
  from the start, the same shape as `DELETE /users/:id`, rather than
  admin-only — an explicit choice over "no self-service delete, contact
  an admin," made for the same reasons already documented under
  "Self-service account deletion" above (real feature, no reason to add
  friction).
- `GET /search-profiles/admin` — a **new, separate, admin-only** endpoint
  (not an extension of self-service `GET /search-profiles`, which always
  means "my own"), listing across all users with pagination and an
  optional `?userId=` filter. Registered before `GET /search-profiles/:id`
  in the controller specifically because both are single-segment path
  patterns under the same resource (`/search-profiles/admin` vs.
  `/search-profiles/:id`) — Nest/Express match routes in registration
  order, so the literal `admin` segment must be declared first or it
  would be swallowed by `:id` and rejected by `ParseUUIDPipe` as a bad
  UUID instead of ever reaching the admin handler. `POST /search-profiles/admin`
  has no such ordering concern (different HTTP method, and its path
  shape doesn't collide with `:id/pause`-style routes either way).
- `POST /search-profiles/admin` — admin-only, creates a Search Profile
  for an explicit `userId` in the request body. Deliberately a separate
  route from self-service `POST /search-profiles`, never a body-level
  `userId` override accepted on the same endpoint: the self-service route
  derives ownership from the verified JWT specifically so a client can
  never claim to act as another user via a request body — accepting a
  client-supplied `userId` there would silently reopen the exact
  enumeration/impersonation class of bug the `GET /search-profiles?userId=...`
  fix already closed (see Security above). Reuses
  `CreateSearchProfileUseCase` completely unchanged (its `userId` field
  was always "whose profile this is," not a caller/owner distinction —
  the self-service controller method already passes the JWT's own id
  there, the admin one just passes a different, explicit one) — including
  the free-tier limit check, which still applies to admin-created
  profiles by design (no separate limit-bypass lever was asked for).
  Unlike the self-service `create()` handler, `createAdmin()` special-cases
  `UserNotFoundError` into a `404` rather than folding it into the
  generic `400` — for self-service that error is practically
  unreachable (a valid JWT always resolves to a real `User`), but for an
  admin-supplied, genuinely-arbitrary `userId` it's a real, expected
  outcome that deserves the more specific status code.
- **Create/update-on-behalf was a deliberate scope addition, not
  originally planned**: the first pass through this list covered only
  read + delete; create/update-on-behalf was added at the user's explicit
  request as a corner-case escape hatch for unforeseen support
  situations, accepted even though no concrete scenario existed yet at
  decision time — consistent with treating an authenticated admin as a
  trusted operator, same trust level already extended by the
  `searchProfileLimit` and account-deletion admin levers.
- **Pagination** (`GET /users`, `GET /search-profiles/admin`) shares one
  convention: `common/pagination/paginationLimits.ts` exports
  `DEFAULT_PAGE_LIMIT` (20) and `MAX_PAGE_LIMIT` (100) as named
  constants — plain `limit`/`offset` query params (not cursor-based),
  matching this project's general preference for the simplest workable
  shape until real data volume proves it insufficient. `MAX_PAGE_LIMIT`
  exists specifically so a caller can't request an unbounded page and
  turn a "list" endpoint into an accidental full-table scan.

### SearchPreferences — composite Value Object

```
SearchPreferences
  keywords: KeywordFilter          (include[], exclude[])
  location: LocationFilter         (countries[], cities[], remote, relocation?)
  compensation: SalaryExpectation  (minimumSalary, currency?)
  seniority: Seniority[]
  employmentTypes: EmploymentType[]
  companies: CompanyFilter         (include[], exclude[])
  sources: SourceId[]
```

Reasoning for compositing: validation rules cluster by meaning (e.g. "if
remote=false, country is required" is a `LocationFilter` rule, not a rule of the
whole `SearchPreferences`).

**Known, deliberate limitation:** this exact field set (`compensation`,
`seniority`, `employmentTypes`, `companies`) is Job-specific — it doesn't
generalize to a future visa-slot or apartment Opportunity. This is intentional,
not an oversight: with only one Opportunity type (Job) built so far, any attempt
to make `SearchPreferences` generic now would be a guess at a shape we can't
validate yet, and would likely be wrong. `compensation`, `seniority`,
`employmentTypes`, `companies` and `location.relocation` are optional today
(default: `relocation` → `false`) — only `location.remote` is required — that's
as far as generalizing goes for now. Revisit this — likely by making
`preferences` type-specific per Opportunity type (e.g. `JobPreferences` vs
`VisaPreferences`) rather than one fixed shape — when a second real Opportunity
type is actually being designed, not before.

**Known, deliberate asymmetry (2026-08-04):** `SearchProfile.updateDetails()`'s
`name` handling has a runtime guard (`input.name?.trim()`) against a caller
passing `null` outside the validated DTO/HTTP path — same reasoning as
`SearchProfile.create()`. `SearchPreferences.create()`, called from
`UpdateSearchProfileUseCase` for the `preferences` field, has no equivalent
guard — passing `null` there throws a raw `TypeError`, not a `Result.fail`.
Not fixed, on purpose: the only current caller is already unreachable with
`null` because `UpdateSearchProfileDto`'s `@ValidateIf` rejects it before the
use case ever runs, and hardening `SearchPreferences.create()` itself would
mean either inventing a new error class for a scenario nothing can currently
trigger, or cascading defensive `?.` through every nested VO it calls into
(`LocationFilter`, `SalaryExpectation`, ...) — real cost for zero live risk.
Revisit if a second caller ever constructs `SearchPreferencesProps` outside
the NestJS DTO/ValidationPipe path (e.g. a CLI import script).

### Domain Events

**Not wired up at all** on the Walking Skeleton (no dispatcher, no subscribers).
List for later, added once a real listener exists:

`SearchProfileCreated/Updated/Paused/Activated/Archived`,
`OpportunityDetected/Updated/Closed/Reopened`,
`MatchCreated/Rejected`,
`NotificationQueued/Sent/Failed`,
`OpportunityOpened/Saved/Applied/Dismissed`,
`CrawlerStarted/Finished/Failed`.

### Ingestion pipeline (Crawl → Normalize → Register → Match → Notify)

Not a separate bounded context — it has no aggregate/invariants of its own, only
orchestration:

- `source`: `Source` entity, `SourceAdapter` port, concrete adapters
  (`DouSourceAdapter`) in infrastructure, `CrawlSourceUseCase`. Source-specific field
  normalization lives here too (that knowledge belongs to the source). Output is a
  source-agnostic DTO, not yet a domain `Opportunity`.
- `opportunity`: takes the DTO, owns Register/Refresh — dedup by `externalId`,
  `contentHash`, status transitions.
- The "crawl → register → match → notify" chain on MVP is a sequential call of use
  cases via a manual trigger/HTTP endpoint, not a cron job or a queue (until
  BullMQ/Redis are actually needed).

## Observability (later, principle only — no files yet)

No logging/alerting infrastructure exists yet — nowhere to send logs to. When it's
added:

- Logging goes through a `Logger` port (interface) in `common/`, implemented by an
  adapter (Nest's built-in Logger, or Pino/Winston) in infrastructure — domain and
  application code never call a concrete logging library directly, same as any
  other external system.
- **Expected domain failures** (`Result.fail` — invalid `SearchPreferences`, duplicate
  profile, etc.) are normal business flow, not errors — they don't get error-level
  logs or alerts, at most a debug log or a metric counter.
- **Unexpected/infrastructure failures** (DB unreachable, a source adapter
  throwing, an uncaught exception) are the actual target for error logs and,
  later, alerts (e.g. Sentry, a Telegram channel for on-call) — that distinction
  should shape the Logger port's API (e.g. separate `warn`/`error` from a
  `logDomainFailure` path) once it's built.

## What we are NOT doing right now

- Microservices.
- CQRS/Event Sourcing for its own sake.
- Redis/BullMQ before there's a real need.
- AI/recommendations.
- Multiple sources at once (DOU only).
- Empty NestJS modules/services/DTOs "just in case" — every decision must answer
  "why is this needed right now".

## Walking Skeleton (first goal)

```
POST /search-profiles
  → Controller
  → CreateSearchProfile Use Case
  → SearchProfile Domain Entity
  → SearchProfileRepository (interface)
  → PrismaSearchProfileAdapter → Postgres
  → 201 Created
```

Real PostgreSQL persistence is wired up (see "Persistence"). Still no
Telegram, no DOU.

## Roadmap (agreed sequence, decided 2026-08-05)

Order matters here — each step is a prerequisite for the next, not just a
backlog:

1. **Auth** — the Telegram-native model described under Security ("Planned
   auth model"). Blocks everything below: nothing should go on a public VPS
   without it. **Done** (2026-08-06/07): Telegram Login Widget verification,
   JWT issuance/guard, per-resource ownership checks on every
   `SearchProfile` endpoint.
2. **Free-tier profile limit** (1 `SearchProfile` per `User`, see Domain →
   "Monetization limit") — needs a real, auth-backed `userId` to count
   against reliably, so it comes right after auth and strictly before
   deployment, not bundled into either. **Done** (2026-08-07): enforced in
   `CreateSearchProfileUseCase`, with a role-based admin endpoint
   (`PATCH /users/:id/search-profile-limit`) to raise a specific user's
   limit — see Domain → "Admin override mechanism".
3. **Deploy the API to a VPS** (see "Deployment") — bundle in the
   already-tracked Security open items that are deployment-readiness gates:
   rate limiting, and the Swagger decision below. **App-side readiness
   done** (2026-08-08): rate limiting/`helmet`/CORS, `Dockerfile`, and
   `docker-compose.yml`'s `app`/`caddy` services — see "Deployment" for the
   full shape. **VPS provisioned, domain pointed** (2026-08-15) — see
   "VPS provisioning" under "Deployment" for the server/domain shape;
   `postgres` + `app` verified live on the server (real login round-trip,
   real DB write). **`caddy` started, real TLS verified** (2026-08-16) —
   `https://befirstapp.com` serves the app with a real Let's Encrypt
   certificate, full stack live. **Still open**: the real `pg_dump`-to-S3
   Postgres backup (Spaceship's AutoBackup is a supplementary whole-disk
   snapshot, not a substitute — see "Deployment"), and the deploy automation itself
   (manually-triggered, per the decision above — not built yet).
   - **Swagger stays public on purpose** (not the original "gate it before
     deployment" plan) — the repo is already public, and having the live
     Swagger reachable via README/direct link is deliberately useful as an
     interview/portfolio artifact. This is safe specifically *because* step
     1 means every real endpoint requires auth by this point — Swagger
     being browsable is just documentation exposure, not a way to actually
     call anything without authorization.
4. **E2E tests (Playwright) against the deployed API** — continues the
   testing-tier plan from "Testing" (unit → integration → e2e, each
   tier checked at the cheapest point that still catches what it's meant
   to). Also a deliberate portfolio choice, not just a testing-pyramid
   checkbox — the user works as a QA/test engineer and wants E2E coverage
   as a visible skill demonstration. Decided (2026-08-08). **Scaffold +
   first spec built (2026-08-17/19)**, own sub-project at `tests/e2e/`
   (see its own `CLAUDE.md` for the full design — separate `package.json`,
   API client layer, AJV response-contract validation against schemas
   pulled live from the deployed OpenAPI spec). **Wired into CI
   (2026-08-28)**: `.github/workflows/e2e-tests.yml` runs the suite
   automatically after a successful `Deploy` run (`workflow_run` trigger),
   with results also reported to Testomat.io (`@testomatio/reporter`,
   only active when the `TESTOMATIO` secret is set — see e2e `CLAUDE.md`
   → "CI: running against a live deploy" for the config shape and a
   known, accepted `npm audit` finding in that package's unused Cucumber
   dependency chain).
   - **Auth resolved** — how the e2e tests authenticate (previously an open
     question) is answered the same way the integration tests already
     do it: sign a real Telegram Login Widget payload with the shared
     `TELEGRAM_BOT_TOKEN` (stored as a GitHub Actions secret matching the
     value on the VPS) and call the real, deployed `POST /auth/telegram`.
     No test-only bypass, no mocked identity check — same code path as a
     real login, just pointed at the live URL instead of an in-process
     app.
   - **No staging environment — e2e run directly against prod**, by
     choice, not as a stopgap. A second VPS would be a second recurring
     cost, working against the cost-predictability reasoning under
     "Deployment" — and testing only against prod, accepting the tradeoff
     that a red e2e run means the bug is already live, is common practice
     even at scale, not just a solo-project compromise. Mitigation: CI at
     least signals fast (red workflow), rollback is a manual
     `git revert` + redeploy for now, not automated.
   - **Test data cleanup happens for real, not left to accumulate** — each
     e2e run's login creates a real `User` row (plus whatever `SearchProfile`
     rows the run creates) in the actual production database. Since
     GitHub Actions runners have no direct network path to the VPS's
     Postgres (and shouldn't — it isn't meant to be publicly reachable),
     cleanup can't reuse the integration tests' "connect a second
     `PrismaClient` and delete by id" pattern — it needs a real
     account-deletion path callable over the API instead. **Done
     (2026-08-16):** `DELETE /users/:id` (see Domain → "Self-service
     account deletion") — a legitimate feature on its own, not built
     solely for test cleanup, but this is exactly the prerequisite this
     step was waiting on. **Wired into the e2e suite itself (2026-08-27):**
     `login.spec.ts`'s `test.afterAll` now calls it directly against the
     deployed API — no orphan `User` rows left behind by a run.
5. **Add a real Unit-of-Work port**, closing two known gaps at once with
   the same primitive — a Postgres transaction (with a row lock on the
   `User` where relevant) threaded across repository calls that are
   currently separate and unsynchronized:
   - The `CreateSearchProfileUseCase` free-tier-limit race (see Domain →
     "Monetization limit" → known gap) — the active/paused count and the
     insert should run inside one transaction, not two independent calls.
   - The `DeleteUserUseCase` orphan race (see Domain → "Self-service
     account deletion" → the crash-vs-race tradeoff) — deleting a user's
     profiles and the user row should run inside one transaction too.
   Deliberately sequenced here, not fixed immediately when either was
   found (2026-08-07, 2026-08-16): both are low severity (no
   data-integrity or security exposure on *other* users' data) and don't
   justify introducing a new architectural primitive mid-feature (nothing
   in this codebase currently threads one Prisma transaction across two
   repository adapters) — but this should land before DOU brings real,
   possibly-automated write traffic into the picture, not be forgotten
   indefinitely.
6. **DOU as the first source** (crawl → normalize → register → match),
   ahead of the bot frontend — deliberately, not an arbitrary pick between
   two equally-good options. Reasoning: without a real source, a bot only
   offers CRUD over `SearchProfile`, which the API already does — no new
   value. DOU is what makes the actual product loop (detect → match →
   notify) real, and it's independently verifiable by inspecting `Match`
   rows in Postgres, without needing a bot or any notification channel
   built yet.
7. **Telegram bot** (separate repo) — chat-first: notifications plus
   one-tap actions via inline keyboard buttons (pause a search, view an
   opportunity, dismiss). This matches the product's actual differentiator
   (fast notification, a bot-native interaction) and is simpler/faster to
   ship than a Mini App. A **Telegram Mini App** (in-Telegram web view,
   same identity model via `initData`) is explicitly a *later*, separate
   task for improving `SearchPreferences` setup/editing specifically — a
   multi-field form is genuinely painful over pure chat — deferred until
   real usage confirms that's worth solving, not built speculatively now.
