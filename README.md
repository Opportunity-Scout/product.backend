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

Search Profiles are persisted in a real local Postgres, through the same
layered flow for every endpoint:

```
POST /search-profiles
  → SearchProfilesController
  → CreateSearchProfileUseCase
  → SearchProfile (domain entity) + SearchPreferences (composite Value Object)
  → SearchProfileRepository (port)
  → PrismaSearchProfileAdapter (adapter) → Postgres
  → 201 Created
```

These endpoints exist so far:

- `POST /auth/telegram` — log in (or sign up) with a Telegram Login Widget
  payload, returns a bearer token.
- `POST /search-profiles` — create, owned by the authenticated caller.
- `GET /search-profiles/:id` — read one (owner or admin).
- `GET /search-profiles` — list the authenticated caller's Search Profiles.
- `PATCH /search-profiles/:id` — update `name`/`description`/`preferences`
  (owner or admin). Omitted fields are left unchanged; `description: null`
  explicitly clears it; `preferences`, if sent, fully replaces the
  existing value.
- `DELETE /search-profiles/:id` — delete a single Search Profile (owner
  or admin); distinct from `archive` below, which is a soft status change.
- `POST /search-profiles/:id/pause` / `/activate` / `/archive` — status
  transitions (`active` → `paused` → `active`, either → `archived`).
- `GET /search-profiles/admin` — admin-only: list Search Profiles across
  all users, paginated, optionally filtered by `?userId=`.
- `POST /search-profiles/admin` — admin-only: create a Search Profile on
  behalf of an explicit `userId` in the body.
- `GET /users` — admin-only: list/search users by Telegram username,
  paginated.
- `PATCH /users/:id/search-profile-limit` — admin-only: set a user's Search
  Profile limit (free tier defaults to `1` active/paused profile).
- `DELETE /users/:id` — delete an account (cascading to all of its Search
  Profiles): self-service for your own account, or an admin can delete
  any account.

Every `/search-profiles` endpoint requires a valid `Authorization: Bearer
<token>` header (obtained from `POST /auth/telegram`) — `userId` is derived
from the token, never client-supplied. No Telegram bot, no DOU integration
yet. Everything below runs **locally only**.

## Stack

- **NestJS** + **TypeScript**, Node **22** (see `.nvmrc` / `engines` in
  `package.json`).
- **Jest** for tests, **ESLint** (flat config) + **Prettier** for linting/formatting.
- **Husky + lint-staged** pre-commit hook (lint + unit tests) — see below.
- **Swagger/OpenAPI** (`@nestjs/swagger`) for interactive API docs.
- **PostgreSQL + Prisma** (via Docker locally) — schema/migrations in
  `prisma/`; the domain/application layers don't know it exists (see
  `CLAUDE.md`).
- Redis / BullMQ are planned but **not wired up yet** — added only once a real
  use case needs them.

## Project structure

```
src/
  main.ts                    Bootstrap (path alias, ValidationPipe, Swagger, then starts Nest)
  registerPaths.ts            Runtime registration of the @app/* alias (tsconfig-paths)
  AppModule.ts
  common/
    kernel/                   Result, DomainError — base building blocks for the domain layer
    persistence/              PrismaService, PrismaModule — shared Prisma wiring
  modules/
    searchProfile/
      domain/                 SearchProfile entity, SearchPreferences + Value Objects, no framework deps
      application/             Use cases + repository port (interface)
      infrastructure/          PrismaSearchProfileAdapter (+ persistence/helpers/ mapper)
      presentation/             Controller, DTO, response presenter

tests/
  unit/                       Mirrors the src/ path of whatever it tests
    modules/searchProfile/...
  integration/                 Boots the real app + a real Postgres, drives it over HTTP
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

### Database (local Postgres via Docker)

```bash
cp .env.example .env   # only the first time — works as-is, edit values if you need to
docker compose up -d
```

Starts a local Postgres container (data persists in a named Docker volume
across restarts; `docker compose down -v` wipes it for a clean slate). The app
reads `DATABASE_URL` from `.env`.

```bash
npm run prisma:migrate   # applies prisma/migrations, prompts for a name on schema changes
npm run prisma:generate  # regenerates the client into node_modules/@prisma/client (also runs after migrate, and after npm install via prepare)
npm run prisma:studio    # GUI to browse/edit local data
```

Schema lives in `prisma/schema.prisma`; the generated client lands in
`node_modules/@prisma/client`, like any other dependency — nothing generated
ends up in the repo.

## Running locally

```bash
# development, with hot reload
npm run start:dev

# plain start (no watch)
npm run start

# production-style: compile then run the compiled output
npm run build
npm run start:prod
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

Every `/search-profiles` call below needs a bearer token first. `POST
/auth/telegram` expects a real Telegram Login Widget payload (`hash` is an
HMAC-SHA256 signature over the other fields, keyed by your bot token) — not
something you can hand-write, so mint one either by signing a payload with
`TELEGRAM_BOT_TOKEN` from `.env` yourself, or reuse the test helper
(`tests/helpers/signTelegramLoginPayloadHelper.ts`) that the auth specs use for
the same purpose. Once you have a token:

```bash
TOKEN="<token from POST /auth/telegram>"

curl -X POST http://localhost:3000/search-profiles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
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

Expect a `201` with the created Search Profile, owned by the token's user.
`location` is the only required part of `preferences`, and within it only
`remote` is mandatory (`relocation` defaults to `false` when omitted; if
`remote` is `false`, at least one `country` is required) — everything else is
optional.

```bash
curl http://localhost:3000/search-profiles/<id-from-the-response-above> \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:3000/search-profiles \
  -H "Authorization: Bearer $TOKEN"
```

The first returns that one Search Profile (`404` if the id doesn't exist,
`400` if it's not a valid UUID); the second returns every Search Profile
owned by the token's user (`[]` if none). Every call without a valid
`Authorization` header gets a `401`.

```bash
curl -X PATCH http://localhost:3000/search-profiles/<id> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "name": "Senior Backend Prague", "description": null }'

curl -X POST http://localhost:3000/search-profiles/<id>/pause -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:3000/search-profiles/<id>/activate -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:3000/search-profiles/<id>/archive -H "Authorization: Bearer $TOKEN"
curl -X DELETE http://localhost:3000/search-profiles/<id> -H "Authorization: Bearer $TOKEN"
```

`PATCH` only touches fields present in the body — omit a field to leave it
unchanged, send `description: null` to clear it, send `preferences` to fully
replace it. The status endpoints enforce legal transitions only
(`pause` needs `active`, `activate` needs `paused`, `archive` accepts either)
— an illegal one (e.g. pausing an already-paused profile) is a `400`.
`DELETE` permanently removes the row (`204` on success) — unlike `archive`,
which just changes its status and keeps the record.

Each user can have at most **1** `active`/`paused` Search Profile at a time
(free tier) — creating a second one while already at the limit is a `400`.
Archiving a profile frees up the slot. An admin can raise a specific user's
limit:

```bash
curl -X PATCH http://localhost:3000/users/<user-id>/search-profile-limit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "limit": 3 }'
```

Requires the caller's own user row to have `role = 'admin'` in Postgres —
there's no self-service way to become an admin. Bootstrap the first one by
hand (`npm run prisma:studio`, or `UPDATE users SET role = 'admin' WHERE id
= '<your-user-id>'`) after logging in once via `POST /auth/telegram`.

An admin can also list users, and read/manage any Search Profile:

```bash
curl "http://localhost:3000/users?search=oleh&limit=20&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl "http://localhost:3000/search-profiles/admin?userId=<user-id>&limit=20&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -X POST http://localhost:3000/search-profiles/admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "userId": "<user-id>", "name": "Backend Prague", "preferences": { "location": { "remote": true } } }'
```

`GET /users` and `GET /search-profiles/admin` are both paginated
(`limit` defaults to `20`, capped at `100`; `offset` defaults to `0`) and
return `{ ..., total, limit, offset }`. `GET /search-profiles/:id`,
`PATCH /search-profiles/:id`, and `DELETE /search-profiles/:id` all
already accept an admin caller too, not just the profile's owner — no
separate admin route needed for those three, the check just widens from
"is this yours" to "is this yours, or are you an admin."

To delete an account (and every Search Profile it owns):

```bash
curl -X DELETE http://localhost:3000/users/<user-id> \
  -H "Authorization: Bearer $TOKEN"
```

Returns `204` on success, `404` if `$TOKEN` belongs to neither the
account's own owner nor an admin (indistinguishable from a nonexistent
id — same reasoning as every other ownership check in this API). An
admin can pass any user's id, not just their own.

### Stopping / cleanup

- `Ctrl+C` in the terminal running `npm run start:dev` (and `npm run
  prisma:studio`, if you opened it).
- `docker compose down` — stops and removes the Postgres container; data
  stays in the named Docker volume for next time.
- `docker compose down -v` — also wipes that volume, for a completely clean
  slate.

## Deployment

Live at **[https://befirstapp.com](https://befirstapp.com)** — the VPS is
provisioned, the domain is live, and `postgres` + `app` + `caddy` are all
running and verified end-to-end on the server (real login round-trip, real
row written to Postgres, real Let's Encrypt TLS certificate).

The app itself is containerized (`Dockerfile`, multi-stage: build then a
lean production image) and `docker-compose.yml` runs three services
alongside the existing local-dev `postgres`: the same `postgres`, `app`,
and `caddy`. `docker compose up -d` builds and runs the full stack;
nothing but Caddy's 80/443 is meant to be reachable from outside the VPS.

Rate limiting, `helmet`, and an explicit (currently closed) CORS policy are
already wired in — see `CLAUDE.md` → "Deployment readiness" for the
reasoning behind each. Server/domain choices (provider, region, plan,
hardening) are documented in `CLAUDE.md` → "VPS provisioning". Deploy
itself (wiring up CI to actually push a new version) is still manual and
not yet automated — tracked in `CLAUDE.md` → "Roadmap".

## Testing, linting, formatting

```bash
npm run test:unit         # unit tests (Jest), no I/O, no Postgres needed
npm run test:unit:watch

npm run test:integration  # boots the real app against Postgres — needs
                           # `docker compose up -d` + migrations applied first

npm run lint          # ESLint, auto-fixes what it can
npm run format        # Prettier
```

Tests live under `tests/`, never next to source files, split by kind
(`unit/`, `integration/`, later `e2e/`) mirroring the `src/` path of whatever
they test — see `CLAUDE.md` for the reasoning.

### Pre-commit hook

Set up automatically by `npm install` (Husky's `prepare` script) — every commit
runs `eslint --fix` on staged files, then the full unit suite. Auto-fixable
lint/formatting issues are fixed and re-staged silently; a real lint error or a
failing test blocks the commit. Integration and e2e tests don't run locally —
they run in CI (before and after deploy respectively), see `CLAUDE.md`.

### CI

[`.github/workflows/integration-tests.yml`](./.github/workflows/integration-tests.yml)
runs `test:integration` against a real Postgres service container on every
push, to any branch — see `CLAUDE.md` for why there's no separate
`pull_request` trigger.

## License

[PolyForm Noncommercial 1.0.0](./LICENSE) — free to view, run locally, and
modify for noncommercial purposes. Commercial use requires a separate
agreement with the licensor.
