# BeFirst Backend

## What this is

BeFirst is an **Opportunity Platform** — its job is to detect new opportunities as
fast as possible and notify the user about them. Jobs are the first Opportunity
type, but the platform is not a job aggregator and the domain model is not built
around the concept of "Job": tomorrow an Opportunity could just as well be a visa
slot, an exam seat, a grant, a conference ticket, or an apartment listing.

The core flow: a user creates a **Search Profile** describing what they're looking
for → the system monitors a source for matching Opportunities → on a match, the
user gets notified.

**MVP scope** (deliberately small):
- One source: [DOU](https://jobs.dou.ua/) (not integrated yet, see "Current state").
- One notification channel: Telegram (not integrated yet).
- No AI, no recommendations, no analytics dashboard, no multiple sources.

The full product/architecture reasoning — domain model, bounded contexts, what's
explicitly out of scope and why — lives in [`CLAUDE.md`](./CLAUDE.md). This file is
just "how do I run this thing."

## Current state: Walking Skeleton

Only one vertical slice exists so far — creating a Search Profile, stored
in-memory:

```
POST /search-profiles
  → SearchProfilesController
  → CreateSearchProfileUseCase
  → SearchProfile (domain entity) + SearchPreferences (composite Value Object)
  → SearchProfileRepository (port)
  → InMemorySearchProfileRepository (adapter)
  → 201 Created
```

No PostgreSQL, no Telegram, no DOU integration yet, and no persistence beyond
process memory (data is lost on restart). Everything below runs **locally only**.

## Stack

- **NestJS** + **TypeScript**, Node **22** (see `.nvmrc` / `engines` in
  `package.json`).
- **Jest** for tests, **ESLint** (flat config) + **Prettier** for linting/formatting.
- **Husky + lint-staged** pre-commit hook (lint + unit tests) — see below.
- **Swagger/OpenAPI** (`@nestjs/swagger`) for interactive API docs.
- PostgreSQL / Prisma / Redis / BullMQ / Docker are planned but **not wired up
  yet** — added only once a real use case needs them.

## Project structure

```
src/
  main.ts                    Bootstrap (path alias, ValidationPipe, Swagger, then starts Nest)
  registerPaths.ts            Runtime registration of the @app/* alias (tsconfig-paths)
  AppModule.ts
  common/
    kernel/                   Result, DomainError — base building blocks for the domain layer
  modules/
    searchProfile/
      domain/                 SearchProfile entity, SearchPreferences + Value Objects, no framework deps
      application/             Use cases + repository port (interface)
      infrastructure/          InMemorySearchProfileRepository
      presentation/             Controller, DTO, response presenter

tests/
  unit/                       Mirrors the src/ path of whatever it tests
    modules/searchProfile/...
```

See `CLAUDE.md` for the naming conventions and the reasoning behind this layout
(feature-first modules, domain/application/infrastructure/presentation per
module, why interfaces live apart from classes, etc).

## Setup

### Prerequisites

- Node **22** (pinned via `.nvmrc` / `engines` in `package.json`).

### Install dependencies

```bash
npm install
```

## Running locally

```bash
# development, with hot reload
npm run start:dev

# plain start (no watch)
npm run start

# production-style: compile then run the compiled output
npm run build
node dist/main.js
```

By default the server listens on port `3000` (override with `PORT=<port>`).

### API documentation (Swagger)

Once the app is running, interactive API docs are at:

```
http://localhost:3000/product-backend-api/swagger
```

Browse the request/response schema for every endpoint and send requests
straight from the browser — no need to hand-craft `curl` calls for manual
testing.

### Try it via curl

```bash
curl -X POST http://localhost:3000/search-profiles \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-1",
    "name": "Backend Prague",
    "preferences": {
      "keywords": { "include": ["nestjs", "node"] },
      "location": { "countries": ["CZ"], "remote": false, "relocation": true },
      "compensation": { "minimumSalary": 3000, "currency": "EUR" },
      "seniority": ["middle", "senior"],
      "employmentTypes": ["full_time"],
      "sources": ["dou"]
    }
  }'
```

Expect a `201` with the created Search Profile. `location` is the only required
part of `preferences`, and within it only `remote` is mandatory (`relocation`
defaults to `false` when omitted; if `remote` is `false`, at least one `country`
is required) — everything else is optional.

## Testing, linting, formatting

```bash
npm run test         # unit tests (Jest)
npm run test:watch

npm run lint          # ESLint, auto-fixes what it can
npm run format        # Prettier
```

Tests live under `tests/unit/`, never next to source files — see `CLAUDE.md` for
the reasoning and how `integration/`/`e2e/` will be added later.

### Pre-commit hook

Set up automatically by `npm install` (Husky's `prepare` script) — every commit
runs `eslint --fix` on staged files, then the full unit suite. Auto-fixable
lint/formatting issues are fixed and re-staged silently; a real lint error or a
failing test blocks the commit. Integration and e2e tests don't run locally —
they run in CI (before and after deploy respectively), see `CLAUDE.md`.
