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
- Small validation errors owned by exactly one class stay co-located in that
  class's file too (e.g. `InvalidSearchProfileNameError` inside `SearchProfile.ts`,
  `LocationRequiresCountryError` inside `LocationFilter.ts`), the same way the
  Value Objects already do it — these are logic (classes), not contracts, so the
  interfaces-separation rule above doesn't apply to them. Only split into their
  own file once a file would need to pick between multiple unrelated exports for
  its name.
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
they need them — not a shared one across test kinds.

Jest config lives in `jest.config.ts` at the **repo root**, not inside `tests/`
— same tier as `tsconfig.json`/`eslint.config.mjs`/`.prettierrc`, alongside every
other tool config. Jest's zero-config auto-discovery (`npm run test` → plain
`jest`) only looks at the project root by default; nesting the config under
`tests/` would mean every invocation needs an explicit `--config` flag, and
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
(`Promise<T>`) but with nothing to actually `await` (`InMemorySearchProfileRepository`,
test fakes) should drop `async` entirely and `return Promise.resolve(value)` —
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

The hook also runs the full unit suite (`npx lint-staged && npm test`) — unit
tests have no I/O by definition, so they stay fast regardless of how many get
added, unlike integration/e2e. That's also why integration/e2e never belong in
a local git hook: **unit** tests run pre-commit (this hook), **integration**
tests run in CI before deploy, **e2e** tests run in CI after deploy, against
the actually-deployed app. Each tier gets checked at the point where it's cheap
to run and still catches what it's meant to catch.

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
- No rate limiting, no `helmet`, no explicit CORS config — acceptable for an
  unauthenticated MVP, revisit before going live.
- `@nestjs/swagger`'s `js-yaml` dependency has a known DoS advisory
  (GHSA-pm4m-ph32-ghv5) in its *parsing* path; we only call `jsyaml.dump()` on
  our own generated document (not reachable through this app as used), but
  re-check when `@nestjs/swagger` ships a fix upstream.

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

## Domain

### Entities

- **User** — system user, has multiple Search Profiles.
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
  → InMemorySearchProfileRepository
  → 201 Created
```

No PostgreSQL, no Telegram, no DOU.
