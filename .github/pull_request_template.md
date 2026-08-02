<!--
Thanks for contributing.

Keep the description short but real — what changed and why. If this is your
first pull request here, remember to leave a separate comment saying you agree
to the CLA (see the checklist below).
-->

## What does this change?

<!-- One or two sentences. What is different after this PR? -->

## Why?

<!-- The problem this solves. Link the issue if there is one: Fixes #123 -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Security fix or hardening
- [ ] Documentation
- [ ] Refactor / cleanup (no behaviour change)
- [ ] Build, CI or tooling
- [ ] Dependency update

## How was this tested?

- [ ] `pnpm lint` is clean
- [ ] `pnpm exec tsc --noEmit` is clean
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes
- [ ] I exercised it manually in a browser

Tested against: <!-- provider(s) and model(s), or "mock models only" -->

<!-- UI change? Please add a screenshot or a short clip. -->

## Configuration and data

- [ ] This PR adds or changes an environment variable — documented in `.env.example` **and** the README configuration table.
- [ ] This PR changes the database schema — the generated migration is committed.
- [ ] Neither of the above.

## Secrets and attribution

- [ ] No API key, token, connection string or `.env` content appears in this diff.
- [ ] No provider credential is exposed to the client bundle, an API response, or a log line.
- [ ] This PR does **not** remove, trim or downplay Vercel's attribution — `NOTICE`, `LICENSE-APACHE-2.0-vercel`, and the attribution section of the README are untouched. *(Required. This project derives from Vercel's Apache-2.0 AI Chatbot template and that attribution is a licence condition.)*

## Checklist

- [ ] I have read [CONTRIBUTING.md](../CONTRIBUTING.md).
- [ ] My commits are signed off (`git commit -s`).
- [ ] **I have read the [CLA](../CLA.md) and I agree to it.** *(A CLA — not a DCO — is required because this project is dual-licensed. You keep your copyright, and it covers your contributions only.)*
- [ ] This PR does one thing.

## Anything else?

<!-- Follow-up work you deliberately left out, decisions you are unsure about. -->
