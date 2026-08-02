# Security Policy

This is self-hosted software. **There is no hosted service here, and no server we
operate that holds your data.** Nobody on this project can see your conversations,
your database, or your API keys — you run the app, you hold the keys, and the
data lives in a PostgreSQL instance you control.

That shapes everything below. Our job is to ship code that does not betray the
operator who runs it. Your job, as that operator, is the deployment itself.

---

## Reporting a vulnerability

**Do not open a public issue, pull request, or discussion for a security
problem.**

Email **<kgupta0183@gmail.com>** with `SECURITY` in the subject line.

Helpful to include, in whatever detail you have:

- What the issue is, and what an attacker gains from it.
- The affected commit or version.
- Your deployment shape — Docker, bare Node, behind which proxy — and which
  model provider you had configured.
- Reproduction steps, or a proof-of-concept.
- Whether you are planning to disclose publicly, and roughly when.

**Please redact your API keys, session cookies and database URLs** from anything
you send. We do not need them, and provider keys turn up in log output more often
than people expect.

A rough report of something real is far more useful than a polished write-up you
never send.

### What to expect

| Stage | Target |
| --- | --- |
| Acknowledgement that a human has read it | **within 72 hours** |
| Initial assessment — confirmed / not reproducible / need more detail | **within 7 days** |
| Fix or documented mitigation for a confirmed issue | **within 30 days**, sooner for anything reachable without authentication, or that exposes keys or other users' data |

This project is maintained by one person. If a deadline is going to slip you will
be told, with a reason and a revised date, rather than left waiting.

### Disclosure policy

- Coordinated disclosure. Please give us **90 days** from acknowledgement before
  going public — earlier if a fix ships sooner, and we will say when it has.
- A GitHub Security Advisory is published for every confirmed vulnerability once
  a fix is available, with a CVE requested where warranted.
- You are credited by the name and handle you choose, unless you prefer not to
  be.
- There is no bug bounty. This is an unfunded open-source project and pretending
  otherwise would waste your time.
- Reporting in good faith will never be met with legal action. Test against your
  own deployment, never someone else's.

### If the bug is upstream

This project is a derivative of
[Vercel's AI Chatbot template](https://github.com/vercel/ai-chatbot) and a lot of
the code here is still Vercel's. If you find something that also affects the
upstream template, please **report it to Vercel as well** —
<https://github.com/vercel/ai-chatbot/security> — so their users get a fix too.
Tell us either way and we will handle our side. The same goes for a bug in a
dependency: report it upstream, and tell us so we can pin or patch.

---

## Supported versions

Fixes land on `main`. There are no backports to older tags.

| Version | Status |
| --- | --- |
| `main` / latest release | Supported — report anything you find |
| Anything older | Not supported. Update before reporting. |

Dependency updates arrive through Dependabot; keeping your deployment current is
part of running it safely.

---

## The threat model, plainly

**You are the operator.** You supply the API keys, you own the PostgreSQL
database, you choose who can sign in, and you decide what sits in front of the
app. There is no multi-tenant service, no shared control plane, and no vendor
holding your users' chats.

We assume an attacker who can reach your deployment over the network, and
separately a signed-in user of your deployment trying to reach data or capability
that is not theirs. We do **not** defend against an attacker who already controls
your host, your database, or your `.env` file.

### API keys and secrets

Your provider credentials and `AUTH_SECRET` live in environment variables that
never leave your infrastructure. What this project owes you:

- **Keys stay server-side.** No provider credential may ever reach the browser
  bundle, a client component, an API response, or an error message rendered to a
  user. A leak of that kind is a **high-severity vulnerability — report it.**
- **Keys stay out of logs.** Including provider error payloads that echo the
  request. Report anything that logs a credential.
- **The app must build and boot without a provider key.** CI enforces this: the
  build job runs with no key set, on purpose.

What is on you: not committing `.env`, rotating keys when someone leaves, and
scoping keys to the smallest budget and permission your provider offers.

### Prompt injection — please read this before reporting

The model reads content it did not write: your messages, uploaded files, tool
output, and anything else you feed it. Untrusted content in that stream can and
will try to steer the model's behaviour. This is a property of language models,
not a defect this project can patch, and **we cannot promise that a model will
never be talked into ignoring its instructions.**

So, concretely:

- **Not a vulnerability here:** getting the model to say something it should not,
  to ignore its system prompt, to reveal that prompt, or to produce output you
  find objectionable. Those are model-behaviour findings. Take them to your
  provider.
- **Is a vulnerability here:** prompt injection that crosses a security boundary
  in *our* code — a tool invoked with attacker-chosen arguments that reads or
  writes data outside the current user's scope, model output rendered as
  executable script in another user's browser, an injected instruction that makes
  the server issue an attacker-controlled outbound request (SSRF), or model
  output that reaches a database query, a file path, or a shell without
  validation.

The line is whether the model can be used to make *the application* do something
the current user was not entitled to do. Tool and artifact code is the place to
look: treat everything a model produces as untrusted input, because it is.

### In scope

Report anything in this list.

**Authentication and sessions** — bypassing sign-in; forging, fixating or
replaying a session; weaknesses in the Auth.js configuration; guest-account
handling that grants more than a guest should have; any way to act as another
user.

**Authorization** — reading, editing or deleting another user's chats, messages,
documents, artifacts, votes or uploads. Any API route that does not check
ownership. Insecure direct object references on IDs.

**Injection and data handling** — SQL injection through the Drizzle layer, SSRF
from server-side fetches, path traversal in file upload or storage, unsafe
deserialization, XSS in the chat renderer, the markdown/code paths, or the
artifact renderers.

**Secrets** — any exposure of `AUTH_SECRET`, provider credentials, or the
database URL, via the client bundle, an API response, an error page, telemetry,
or logs.

**File uploads** — writes outside the intended upload directory, unchecked
content type or size that leads to a real impact, or stored files served in a way
that lets them execute.

**Tools and artifacts** — the code in `lib/ai/tools/` and `artifacts/` acting on
model output without validation, in the ways described above.

**Rate limiting** — bypassing the Redis-backed rate limiting when it is
configured, in a way that lets an unauthenticated visitor burn the operator's
provider budget.

**Build and supply chain** — a dependency or build step that exfiltrates
environment variables, or anything that makes the shipped bundle differ from the
source.

### Out of scope

Not vulnerabilities in this project. Reported in good faith they will still get a
polite reply, but they will be closed.

- **Model behaviour and prompt-injection findings that do not cross a code
  boundary**, as described above. Jailbreaks, hallucinations, refusals, offensive
  output — those belong with your model provider.
- **Vulnerabilities in third-party services and packages** — your model provider,
  PostgreSQL, Redis, Next.js, or any npm dependency. Report those upstream. If
  *we* use one of them unsafely, that is in scope, and the difference matters.
- **Operator configuration.** No TLS in front of the app, a `POSTGRES_URL`
  reachable from the public internet, a weak or reused `AUTH_SECRET`, a `.env`
  committed to your own repository, open sign-ups on a deployment you meant to
  keep private, or an over-permissioned provider key. The app cannot fix your
  deployment for you.
- **Documented development and test placeholders.** `.env.example` ships with
  `****` in place of every value; CI builds with a literal placeholder
  `AUTH_SECRET` and no provider key; the Playwright suite runs against the mock
  models in `lib/ai/models.mock.ts`. These are deliberate and are not used by any
  real deployment. Finding them in the source is not a finding.
- Attacks requiring host, database or `.env` access — at that point there is
  nothing left to protect.
- Missing hardening with no demonstrated impact: a header, a version banner, or a
  scanner's default-severity output with no exploit path. Show us the impact.
- Denial of service through sheer traffic volume. Put a proxy or a CDN in front
  of it.
- Social engineering of the maintainer or of your users.
- Costs incurred by legitimate use of your own provider key.

---

## For operators: reducing your own exposure

Not part of the reporting policy, but worth stating.

- Set a strong, unique `AUTH_SECRET` (`openssl rand -base64 32`). Changing it
  invalidates every existing session.
- **Never commit `.env`.** If a key does get committed, rotate it at the
  provider — deleting the commit is not enough.
- Terminate TLS in front of the app. Do not expose PostgreSQL or Redis to the
  public internet.
- Decide deliberately who can sign in. An AI chat app open to the internet is
  someone else's free inference on your budget.
- Set spend limits and alerts at your provider, and configure `REDIS_URL` so
  rate limiting is actually on.
- If you point the app at a local model server (Ollama, llama.cpp, vLLM, LM
  Studio), keep that endpoint on a private network. Those servers usually have no
  authentication of their own.
- Keep dependencies current. Watch the repository for security advisories.
- Back up your database, and remember it contains your users' conversations —
  treat those backups accordingly.

---

## Contact

**Karan Garg** — engineer and community professional.

<kgupta0183@gmail.com> ·
GitHub [@iampopye](https://github.com/iampopye) ·
X [@mrtechgarg](https://x.com/mrtechgarg) ·
LinkedIn <https://www.linkedin.com/in/karan-garg-tech/>
