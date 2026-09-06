---
name: senior-review
description: Use when asked to review the current branch's changes locally (not a GitHub PR) — e.g. "review my branch", "review these commits", "look at the changes in this branch", "review the diff" — regardless of what language the request is phrased in. Produces a senior-developer-level review written directly into the chat: no code edits, no test/lint/build runs, no PR comments. Optionally cross-checks a ClickUp ticket (given directly by the user, or found in a commit message) against what the code actually does. For reviewing an actual open GitHub PR, use /review or /code-review instead; for a security-focused deep dive, use /security-review.
---

# Senior-level local branch review

This is a **read-only, single-pass** review — the opposite of `/code-review`'s
5-parallel-agent GitHub-PR pipeline. It exists specifically to review a local
branch (often not even pushed yet) cheaply, without burning tokens on
multi-agent fan-out or side-effecting commands.

## Hard rules

1. **Never edit, format, or fix code during this skill.** No `Edit`/`Write`
   calls to source files. If you spot something worth fixing, describe it in
   the chat output — don't act on it unless the user asks afterward.
2. **Never run tests, lint, or build.** This repo's own testing tiers (root
   `CLAUDE.md` → "Testing") already assign unit tests to the pre-commit hook
   and integration/e2e to CI — re-running them here is redundant token spend,
   not a safety net this skill needs to provide. Read code to reason about
   correctness instead.
3. **Never comment on a PR, push, or otherwise touch shared state.** Output
   goes to the chat only.
4. **Single pass, no subagents.** Don't spawn parallel review agents for this
   — the whole point is to stay cheap. Do the reading and reasoning directly.
5. Write the conclusions in the same language the user used to ask for the
   review.

## 1. Determine what's being reviewed

Default scope is "this branch vs. its base": find the base (usually `main`;
`git status` in the environment info at the top of the conversation names it
as "Main branch"), then:

```
git log <base>..HEAD --oneline
git diff <base>..HEAD --stat
```

Review **per commit** (`git show <sha>` for each), not just the squashed total
diff — commit boundaries usually encode the author's own grouping of unrelated
changes (e.g. a real fix vs. an unrelated test-flake fix), and that grouping
is itself worth checking, not collapsing.

If the user instead points at something narrower (a specific commit, a
specific file, "just the last commit"), scope to that instead of the whole
branch.

## 2. Ticket context — optional, sourced flexibly

Tickets aren't always in play, and when they are, the user may hand you the
reference in different ways. Check, in this order, and use whichever hits
first:

1. **The user's own request** — they may paste a ClickUp URL, a bare ticket
   ID (e.g. `869et91gr`), or a task title directly in the message asking for
   the review.
2. **Commit messages** in the range being reviewed — look for a ClickUp
   reference (`ClickUp <id>`, `app.clickup.com/t/<id>`, or a bare
   short-alphanumeric ID in that shape).
3. **Nothing found** — proceed without a ticket, and say so explicitly in the
   output rather than silently skipping this step or guessing the intent.

Don't assume every commit in the range maps to the same ticket — check each
commit's own message; some may be unrelated cleanup/fixes (as seen in
practice: one commit mapped to a ticket, the very next one didn't).

When a ticket ID is known, use the `clickup-personal-tasks` MCP server to
fetch it. Note its current shape: `list_tasks` only lists open tasks in one
list with no get-by-id call, and the dump is large enough to exceed inline
output — expect it to be saved to a file, then `grep` that file for the
specific ID rather than reading the whole thing. If the ID isn't found there,
it may simply be closed/archived (the tool only lists open tasks) — say that
explicitly rather than concluding the ticket doesn't exist. Re-run `ToolSearch`
for `clickup` first if the tool isn't loaded yet in this session.

Once you have the ticket text, check the implementation against it like a
senior reviewer would check a diff against its ticket:
- Does the change actually address the stated goal?
- Does it violate any explicit constraint the ticket calls out (e.g. "don't
  fix this by loosening X")?
- If the ticket brainstormed candidate approaches, does the diff use one of
  them, or something else — and if something else, is that actually
  justified, or a scope/assumption mismatch worth flagging?

## 3. Cross-check against CLAUDE.md

Read the root `CLAUDE.md`, plus any nested `CLAUDE.md` under directories the
diff touches (e.g. `tests/e2e/CLAUDE.md`). Look specifically for:

- Naming/structure conventions relevant to the touched files.
- The **Security** section's gate rule: anything with a real security angle
  (new endpoint, new dependency, a changed default that affects what's
  exposed/trusted, a changed trust boundary) is supposed to be validated with
  the user *before* implementing — flag it if the diff does this unilaterally
  with no sign that happened, even if the commit message reasons about it
  after the fact.
- Whether the change resolves, or contradicts, a documented "Known,
  deliberate gap" / "Known, accepted limitation" elsewhere in the file(s) —
  check both directions.
- Whether the documentation itself now needs a follow-up edit to stay in
  sync (this project treats `CLAUDE.md` as living decision history, not
  static docs — a fix that resolves a documented gap but leaves the gap's
  note unedited is itself a finding worth calling out).

## 4. Review like a senior engineer, not a linter

Beyond mechanical rule-matching: is the chosen solution proportionate to the
problem, or bigger/riskier than necessary? Are there edge cases the diff
doesn't handle? Do the commit messages and commit boundaries actually match
what the diffs do? Is test coverage (given this project's unit /
integration / e2e tiers) adequate for the kind of change this is?

## 5. Output format

Write directly into the chat, no tool call needed for this — plain prose,
grouped per commit or per logical change, each point citing concrete
`file:line`. End with a short overall verdict. Don't soften a real finding to
be agreeable, and don't invent issues to seem thorough — if a commit is
clean, say so briefly and move on.
