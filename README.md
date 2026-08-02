# Self-Hosted AI Chat

A self-hostable, provider-agnostic AI chat application you run on your own server.

Bring your own model. Run it anywhere. Keep your data.

---

## Attribution first: where this came from

**This project is a derivative work of [Vercel's AI Chatbot template](https://github.com/vercel/ai-chatbot), used under the Apache License 2.0.**

The repository started life as an unmodified copy of that template. A large amount of
the code here — the chat UI, the artifacts system, the Drizzle schema, the Auth.js
setup — is still Vercel's work, and it is excellent work.

The combined work here is licensed **AGPL-3.0-or-later**. The Vercel-derived
portions remain **© 2024 Vercel, Inc. under Apache-2.0** — that text is kept at
[`LICENSE-APACHE-2.0-vercel`](LICENSE-APACHE-2.0-vercel) and the full attribution
is in [`NOTICE`](NOTICE). Apache-2.0 is one-way compatible with AGPL-3.0, which
is what makes this combination lawful; it does not revoke anyone's Apache-2.0
rights in Vercel's original code. Karan Garg claims copyright only in his own
modifications.

**What is genuinely new here**, and the reason this fork exists:

| Area | Upstream template | This project |
| --- | --- | --- |
| Model provider | Routed through Vercel AI Gateway; model list hardcoded | Provider-agnostic registry: Anthropic, OpenAI, Groq, OpenRouter, any OpenAI-compatible endpoint, or the Gateway. Chosen by env config. |
| Model catalog | Hardcoded list in source | Discovered at runtime from whichever provider you configured |
| Hosting | Vercel-oriented, one-click deploy | `docker compose up` with Postgres; runs on any box |
| File uploads | Vercel Blob (required) | Inlined as data URLs by default, no storage service needed; Vercel Blob optional |
| Bot detection / tracing | Vercel BotID + OTel always on | Both optional, off by default |
| Telemetry | Vercel Analytics assumptions | None by default |

If you want the original, hosted, Vercel-native experience, use
[vercel/ai-chatbot](https://github.com/vercel/ai-chatbot) — it is the better choice
for that. This fork is for people who want to run the thing themselves.

---

## Why this exists

Most open chat UIs quietly bind you to one AI vendor. Swapping providers means
editing source. This project treats the provider as configuration:

- **Bring your own model.** No provider is baked into the code. Set an API key for
  Anthropic, OpenAI, Groq, or OpenRouter — or point it at any OpenAI-compatible
  endpoint (Ollama, llama.cpp, vLLM, LM Studio) and run entirely offline.
- **Runs anywhere.** A real `docker compose up` path with PostgreSQL. No platform
  service is mandatory.
- **Your data stays yours.** Local Postgres, no telemetry by default, and no
  third-party requests from the browser at runtime.

## Stack

Next.js 16 (App Router) · AI SDK 6 · TypeScript · Drizzle ORM + PostgreSQL ·
Auth.js (next-auth) · Tailwind CSS · shadcn/ui + Radix · Biome/Ultracite ·
Playwright

---

## Quick start (Docker)

```bash
git clone https://github.com/iampopye/chatbot.git
cd chatbot
cp .env.example .env

# Generate an auth secret and put it in .env as AUTH_SECRET
openssl rand -base64 32

# Add at least one provider key to .env, e.g.
#   ANTHROPIC_API_KEY=sk-ant-...
# ...or point at a local model server, e.g.
#   OPENAI_COMPATIBLE_BASE_URL=http://host.docker.internal:11434/v1
#   OPENAI_COMPATIBLE_MODELS=llama3.1:8b

docker compose up -d
```

The app is on <http://localhost:3000>. Postgres runs in the stack and migrations
are applied on container start.

To stop and remove everything including the database volume:

```bash
docker compose down -v
```

## Quick start (local Node)

Requires Node 20+, pnpm 9, and a PostgreSQL instance.

```bash
pnpm install
cp .env.example .env      # fill in AUTH_SECRET, POSTGRES_URL, a provider key
pnpm db:migrate
pnpm dev
```

---

## Choosing your model provider

Set an API key and the provider becomes available. Set several and you can switch
between them in the model picker at runtime.

| Provider | Enable with | Notes |
| --- | --- | --- |
| Anthropic | `ANTHROPIC_API_KEY` | |
| OpenAI | `OPENAI_API_KEY` | |
| Groq | `GROQ_API_KEY` | |
| OpenRouter | `OPENROUTER_API_KEY` | Hundreds of models behind one key |
| OpenAI-compatible | `OPENAI_COMPATIBLE_BASE_URL` | Ollama, llama.cpp, vLLM, LM Studio, LiteLLM, anything speaking `/v1/chat/completions` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` | The upstream template's default, kept as an option |

### Model IDs

Models are addressed as `provider:model`, split on the **first** colon:

```
anthropic:claude-sonnet-4-5
openai:gpt-4.1-mini
groq:llama-3.3-70b-versatile
openrouter:anthropic/claude-3.5-sonnet     # slashes are fine
compatible:llama3.1:8b                     # further colons are fine
gateway:openai/gpt-4.1-mini
```

### Where the model list comes from

By default the app **asks your provider what models it has** at runtime and caches
the answer for a few minutes. Nothing is hardcoded, so the list does not go stale.
If discovery fails (no network, or a provider without a list endpoint), a small seed
list is used so the UI still works.

You can override the catalog completely with `AI_MODELS`, a JSON array:

```bash
AI_MODELS='[
  {"id":"anthropic:claude-sonnet-4-5","name":"Claude Sonnet 4.5","description":"Balanced"},
  {"id":"compatible:llama3.1:8b","name":"Llama 3.1 8B","description":"Local"}
]'
```

Optional per-entry field: `"reasoningTag":"think"` wraps the model so `<think>…</think>`
output is surfaced as reasoning (useful for DeepSeek-R1-style local models).

### Running fully offline with Ollama

```bash
ollama pull llama3.1:8b
```

```bash
# .env
OPENAI_COMPATIBLE_BASE_URL=http://host.docker.internal:11434/v1
OPENAI_COMPATIBLE_MODELS=llama3.1:8b
OPENAI_COMPATIBLE_LABEL=Ollama
DEFAULT_CHAT_MODEL=compatible:llama3.1:8b
```

No API key needed. No request leaves your machine.

---

## Configuration reference

All configuration is via environment variables. See [`.env.example`](.env.example)
for the annotated list. The essentials:

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | yes | Session encryption. `openssl rand -base64 32` |
| `POSTGRES_URL` | yes | PostgreSQL connection string |
| `DEFAULT_CHAT_MODEL` | no | Model used for new chats |
| `TITLE_MODEL` / `ARTIFACT_MODEL` | no | Cheap models for chat titles and artifacts |
| `STORAGE_DRIVER` | no | `inline` (default) or `vercel-blob` |
| `MAX_UPLOAD_BYTES` | no | Attachment size cap, default 5 MB |
| `REDIS_URL` | no | Enables IP rate limiting |
| `ENABLE_OTEL` | no | OpenTelemetry export, off by default |
| `ENABLE_BOTID` | no | Vercel BotID protection, off by default |

---

## Landing page

A self-contained landing page with a bring-your-own-key demo lives at
[`docs/index.html`](docs/index.html). Open it directly in a browser, or serve
`docs/` anywhere static. It loads no external assets and has no backend: the
demo keeps your API key in `localStorage` and calls your chosen provider
directly from the browser.

## Security

Please report vulnerabilities privately — see [SECURITY.md](SECURITY.md).
Do not open a public issue for a security problem.

When self-hosting: set a strong `AUTH_SECRET`, never commit `.env`, terminate TLS
in front of the app, and do not expose Postgres to the public internet.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Because the project is dual-licensed,
contributors sign a lightweight [CLA](CLA.md) — you keep full copyright of your
work; you grant a licence alongside it. The reasoning is spelled out honestly in
that file.

## Licence

**AGPL-3.0-or-later** for everyone — see [LICENSE](LICENSE). Run it, modify it,
self-host it for yourself or your clients at no cost. If you modify it and offer
it to others over a network, you must share your modified source.

**A [commercial licence](COMMERCIAL.md) is available** for organisations that
cannot accept that obligation. Pricing is not published yet; it is early and a
made-up number would be dishonest. Contact <kgupta0183@gmail.com>.

Licence provenance, stated plainly:

| | |
|---|---|
| Combined work | AGPL-3.0-or-later, © 2026 Karan Garg — [LICENSE](LICENSE) |
| Vercel-derived portions | Apache-2.0, © 2024 Vercel, Inc. — [LICENSE-APACHE-2.0-vercel](LICENSE-APACHE-2.0-vercel) |
| Full attribution | [NOTICE](NOTICE) |

Apache-2.0 is [one-way compatible](https://www.apache.org/licenses/GPL-compatibility.html)
with AGPL-3.0, so Apache-2.0 code may be incorporated into an AGPL-3.0 work. The
upstream code stays available under Apache-2.0 from
[vercel/ai-chatbot](https://github.com/vercel/ai-chatbot) regardless of anything
done here. If you redistribute this project you must keep `LICENSE`,
`LICENSE-APACHE-2.0-vercel` and `NOTICE`.

## Maintainer

**Karan Garg** — engineer and community professional.

- Email: <kgupta0183@gmail.com>
- GitHub: [@iampopye](https://github.com/iampopye)
- X: [@mrtechgarg](https://x.com/mrtechgarg)
- LinkedIn: <https://www.linkedin.com/in/karan-garg-tech/>
