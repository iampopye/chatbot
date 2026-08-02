# Contributing

Thanks for being here. This project is a self-hostable, provider-agnostic AI chat
app — the kind of thing that only gets good when people who actually run it send
patches back. Bug reports from your own deployment are as valuable as code.

This guide gets you from a clean checkout to a merged pull request.

---

## First: the attribution rule

This repository is a derivative of
[Vercel's AI Chatbot template](https://github.com/vercel/ai-chatbot), used under
the Apache License 2.0. A large amount of the code here is still Vercel's work.

**Vercel's copyright and attribution must never be removed, weakened, or moved
somewhere less visible.** That means [`NOTICE`](NOTICE),
[`LICENSE-APACHE-2.0-vercel`](LICENSE-APACHE-2.0-vercel), and the attribution
section at the top of the [README](README.md) stay exactly where they are. This
is not a formality — Apache-2.0's one-way compatibility with AGPL-3.0 is what
makes this project lawful, and Section 4(d) attribution is a condition of it.

A pull request that deletes, trims, or downplays any of that will be closed. If
you think one of those files contains a factual error, open an issue and say so
— that is a completely different thing and very welcome.

---

## Before your first pull request: the CLA

This project is dual-licensed — [AGPL-3.0](LICENSE) for everyone, and a
[commercial licence](COMMERCIAL.md) for organisations that cannot accept the
AGPL's source-sharing obligations. Selling that commercial licence is what funds
the project.

That only works if a single party holds the rights to license the contributed
code under both. A DCO is not enough here: a DCO certifies that you had the right
to submit your patch, but it grants nobody the rights needed to offer that patch
under a second, non-AGPL licence. It also cannot be retrofitted later. So this
project uses a **CLA**, not a DCO.

**You keep your copyright.** You grant a licence *alongside* your own rights, not
instead of them. The CLA also states explicitly that it covers **your**
contributions only — nobody is claiming ownership of Vercel's code. Read it, it
is short: **[CLA.md](CLA.md)**.

Signing is two steps, once per contributor:

1. Sign off every commit:

   ```bash
   git commit -s -m "Fix the thing"
   ```

   `-s` appends `Signed-off-by: Your Name <your@email>` from your git identity.

2. On your **first** pull request only, leave one comment:

   ```
   I have read the CLA and I agree to it.
   ```

Never again on later PRs.

If you are not comfortable with the CLA, that is a completely reasonable
position. Open an issue describing the fix instead — we would still much rather
have your knowledge than not.

---

## Repository layout

| Path | What lives there |
| --- | --- |
| `app/` | Next.js App Router. Route groups: `app/(chat)` for the chat UI and its API routes, `app/(auth)` for Auth.js configuration and the sign-in flow. |
| `components/` | React components. `components/ui` is shadcn/ui, `components/elements` and `components/ai-elements` are the chat primitives. |
| `lib/ai/` | The model layer — provider wiring, the model catalogue, prompts, and the tools the model can call (`lib/ai/tools/`). |
| `lib/db/` | Drizzle schema, queries, and migrations. |
| `lib/editor/` | ProseMirror configuration for the document artifacts. |
| `artifacts/` | The artifact types (code, image, sheet, text) and their renderers. |
| `hooks/` | Shared React hooks. |
| `tests/` | Playwright end-to-end tests, page objects and fixtures. |

---

## Set up a development environment

You need **Node 20+** (CI runs Node 22), **pnpm 9**, and a **PostgreSQL**
instance. pnpm is pinned via `packageManager` in `package.json`, so
[Corepack](https://nodejs.org/api/corepack.html) will pick the right version:

```bash
git clone https://github.com/iampopye/chatbot.git
cd chatbot

corepack enable
pnpm install

cp .env.example .env
```

Fill in `.env`:

- `AUTH_SECRET` — required. Generate one with `openssl rand -base64 32`.
- `POSTGRES_URL` — required. Any reachable PostgreSQL instance.
- A model provider credential — see the provider table in the
  [README](README.md#choosing-your-model-provider) for what your checkout
  supports, and `.env.example` for the annotated list.

Then:

```bash
pnpm db:migrate     # apply migrations
pnpm dev            # http://localhost:3000
```

If you would rather run the whole stack in containers, follow the Docker quick
start in the [README](README.md).

**Never commit `.env`.** It is gitignored; keep it that way. If you paste a
config snippet into an issue or a PR, redact the keys.

### Working on the database schema

```bash
pnpm db:generate    # generate a migration from schema changes
pnpm db:migrate     # apply it
pnpm db:studio      # browse the data
pnpm db:check       # check migration consistency
```

Commit the generated migration files alongside the schema change. `pnpm build`
runs migrations before building, so a schema change without its migration breaks
the build for everyone.

---

## Running the checks

Run all four before you push — they are exactly what CI runs:

```bash
pnpm lint              # Ultracite / Biome
pnpm exec tsc --noEmit # typecheck
pnpm build             # Next.js production build (runs migrations first)
pnpm test              # Playwright end-to-end tests
```

`pnpm format` applies the autofixable lint and formatting changes for you. Run it
rather than hand-fixing style complaints.

**About the tests.** They are Playwright end-to-end tests, not unit tests. They
run against a real browser and a real server, but **not** a real model provider —
`pnpm test` sets `PLAYWRIGHT=True`, which swaps the language models for the mocks
in `lib/ai/models.mock.ts`. This means the suite runs offline and costs nothing.
Keep it that way: never add a test that makes a live provider call.

You may need to install the browsers once:

```bash
pnpm exec playwright install --with-deps
```

The CI pipeline is [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Note
that the build job deliberately runs with **no provider key set** — proving the
app builds without one is part of what that job exists to check. Do not
introduce a build-time dependency on a provider credential.

---

## Code style

Formatting and linting are automated, so there is nothing to argue about:

- **Biome via Ultracite** — config in `biome.jsonc`. `pnpm format` fixes
  everything fixable. Do not hand-format.
- **TypeScript, strict.** `pnpm exec tsc --noEmit` must be clean. Avoid `any`; if
  you genuinely need an escape hatch, leave a comment saying why.
- **Server Components by default.** Add `"use client"` only when a component
  actually needs browser state or effects.
- **Never import server-only code into a client component.** `server-only` is a
  dependency for exactly this reason.
- **Keep provider assumptions out of the UI.** Which model is in use is
  configuration; components should not hardcode a vendor.
- Comments explain *why*, not *what*. If you add a guard, say what breaks
  without it.

When you touch Vercel-derived code, prefer the smallest change that does the job.
Small, legible diffs against upstream make it far easier to pull in improvements
from the template later.

---

## Commits

Short, imperative subject lines. Conventional Commits prefixes are used in this
repository and are preferred:

```
fix: drop stale Biome nursery rule that broke lint
feat: add a local filesystem storage driver
docs: explain the model ID format
ci: add build pipeline, dependabot and funding config
```

Common prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`,
`ci:`, `perf:`.

Guidelines:

- Imperative mood, no trailing full stop, ~72 characters.
- One logical change per commit.
- If the *why* is not obvious from the subject, write a body. Wrap at 72.
- Reference issues in the body: `Fixes #12`.
- **Every commit needs a sign-off** — use `git commit -s`.

---

## Pull requests

1. Branch from `main`: `git checkout -b feat/anthropic-provider`
2. Make the change.
3. Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `pnpm test`.
4. Push and open a PR. Fill in the template.
5. First PR only: comment `I have read the CLA and I agree to it.`

What gets a PR merged quickly:

- It does one thing, and the description says what and why.
- CI is green.
- UI changes come with a screenshot or a short clip.
- Changes to the model layer say which providers you actually tested against.
- New configuration is documented in `.env.example` and the README's
  configuration table.

`main` is protected. Changes land by squash-merge through a PR; force-pushes and
branch deletion are blocked.

---

## Reporting bugs and asking for features

- **Bugs** — [open a bug report](https://github.com/iampopye/chatbot/issues/new?template=bug_report.yml).
  Include your provider, your deployment shape, and browser console or server
  logs. **Redact your API keys** — they appear in more error messages than you
  would expect.
- **Features** — [open a feature request](https://github.com/iampopye/chatbot/issues/new?template=feature_request.yml).
- **Questions and ideas** — [GitHub Discussions](https://github.com/iampopye/chatbot/discussions).
- **Security vulnerabilities** — do **not** open an issue. Follow
  [SECURITY.md](SECURITY.md).

A note on scope: this project deliberately does not try to be the upstream
template. If you want the hosted, Vercel-native experience, use
[vercel/ai-chatbot](https://github.com/vercel/ai-chatbot) — it is the better
choice for that. Changes here should serve people running the thing themselves.

---

## Code of Conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). It
applies to issues, pull requests, discussions, and anywhere else the project is
represented.

---

## Maintainer

**Karan Garg** — engineer and community professional.

GitHub [@iampopye](https://github.com/iampopye) ·
X [@mrtechgarg](https://x.com/mrtechgarg) ·
LinkedIn <https://www.linkedin.com/in/karan-garg-tech/> ·
<kgupta0183@gmail.com>
