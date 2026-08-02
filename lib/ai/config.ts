/**
 * Server-side AI provider configuration.
 *
 * Nothing here is baked in at build time: every provider is enabled purely by
 * the presence of its environment variables, so the same image can be pointed
 * at Anthropic, OpenAI, Groq, OpenRouter, a self-hosted OpenAI-compatible
 * server, or the Vercel AI Gateway without a rebuild.
 *
 * Do NOT import this module from a client component - it reads `process.env`
 * and pulls in provider SDKs. The browser gets the catalog from `/api/models`.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGateway } from "@ai-sdk/gateway";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  type ChatModel,
  PROVIDER_LABELS,
  type ProviderId,
  PROVIDER_IDS,
  qualifyModelId,
  UNCONFIGURED_MODEL_ID,
} from "./models";

type LanguageModel = ReturnType<
  ReturnType<typeof createAnthropic>["languageModel"]
>;

const DEFAULT_BASE_URLS: Record<ProviderId, string> = {
  anthropic: "https://api.anthropic.com/v1",
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  compatible: "",
  gateway: "",
};

/**
 * Minimal fallback lists, used only when live discovery is unavailable (no
 * network, or a provider that exposes no model listing endpoint). The
 * authoritative list always comes from the provider itself.
 */
const SEED_MODELS: Record<ProviderId, string[]> = {
  anthropic: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-5"],
  openai: ["gpt-4.1-mini", "gpt-4.1", "gpt-5.2"],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
  ],
  openrouter: ["anthropic/claude-sonnet-4.5", "openai/gpt-4.1-mini"],
  compatible: [],
  gateway: ["openai/gpt-4.1-mini", "anthropic/claude-haiku-4.5"],
};

/** Model ids that look like reasoning models emitting `<think>` blocks. */
const THINK_TAG_MODEL = /(deepseek-?r1|qwq|thinking|reasoner)/i;

function env(name: string): string | undefined {
  const value = process.env[name];

  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();

  return trimmed === "" ? undefined : trimmed;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getBaseUrl(provider: ProviderId): string | undefined {
  const override =
    provider === "compatible"
      ? env("OPENAI_COMPATIBLE_BASE_URL")
      : env(`${provider.toUpperCase()}_BASE_URL`);

  const base = override ?? DEFAULT_BASE_URLS[provider];

  return base ? stripTrailingSlash(base) : undefined;
}

export function getApiKey(provider: ProviderId): string | undefined {
  if (provider === "compatible") {
    return env("OPENAI_COMPATIBLE_API_KEY");
  }

  if (provider === "gateway") {
    return env("AI_GATEWAY_API_KEY");
  }

  return env(`${provider.toUpperCase()}_API_KEY`);
}

export function getProviderLabel(provider: ProviderId): string {
  if (provider === "compatible") {
    return env("OPENAI_COMPATIBLE_LABEL") ?? PROVIDER_LABELS.compatible;
  }

  return PROVIDER_LABELS[provider];
}

/**
 * A provider is available when it has what it needs to make a request:
 * an API key, or - for a self-hosted endpoint - a base URL.
 */
export function isProviderConfigured(provider: ProviderId): boolean {
  if (provider === "compatible") {
    return Boolean(env("OPENAI_COMPATIBLE_BASE_URL"));
  }

  return Boolean(getApiKey(provider));
}

export function getConfiguredProviders(): ProviderId[] {
  return PROVIDER_IDS.filter(isProviderConfigured);
}

/** Explicit models for a self-hosted endpoint, when discovery is not wanted. */
export function getCompatibleModelOverrides(): string[] {
  const raw = env("OPENAI_COMPATIBLE_MODELS");

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function createLanguageModel(
  provider: ProviderId,
  model: string
): LanguageModel {
  const baseURL = getBaseUrl(provider);
  const apiKey = getApiKey(provider);

  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey, baseURL }).languageModel(model);

    case "openai":
      return createOpenAI({ apiKey, baseURL }).languageModel(model);

    case "groq":
      return createGroq({ apiKey, baseURL }).languageModel(model);

    case "gateway":
      return createGateway({ apiKey }).languageModel(model);

    case "openrouter":
    case "compatible": {
      if (!baseURL) {
        throw new Error(
          `No base URL configured for the "${provider}" provider.`
        );
      }

      return createOpenAICompatible<string, string, string, string>({
        name: provider,
        baseURL,
        apiKey,
      }).chatModel(model);
    }

    default: {
      const exhaustive: never = provider;

      throw new Error(`Unknown provider: ${String(exhaustive)}`);
    }
  }
}

/**
 * Heuristic for models that stream chain-of-thought inside `<think>` tags.
 * Can always be overridden explicitly through `AI_MODELS`.
 */
export function inferReasoningTag(model: string): string | undefined {
  return THINK_TAG_MODEL.test(model) ? "think" : undefined;
}

export function toChatModel(
  provider: ProviderId,
  model: string,
  overrides?: Partial<Pick<ChatModel, "name" | "description" | "reasoningTag">>
): ChatModel {
  return {
    id: qualifyModelId(provider, model),
    name: overrides?.name ?? model,
    description: overrides?.description,
    provider,
    providerLabel: getProviderLabel(provider),
    reasoningTag: overrides?.reasoningTag ?? inferReasoningTag(model),
  };
}

type RawModelOverride = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  reasoningTag?: unknown;
};

/**
 * Fully user-supplied catalog via the `AI_MODELS` env var (JSON array).
 * Returns an empty array when unset or malformed.
 */
export function getModelOverrides(): ChatModel[] {
  const raw = env("AI_MODELS");

  if (!raw) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("AI_MODELS is not valid JSON - ignoring it.");

    return [];
  }

  if (!Array.isArray(parsed)) {
    console.warn("AI_MODELS must be a JSON array - ignoring it.");

    return [];
  }

  const models: ChatModel[] = [];

  for (const entry of parsed as RawModelOverride[]) {
    if (typeof entry?.id !== "string") {
      continue;
    }

    const separator = entry.id.indexOf(":");
    const provider = entry.id.slice(0, separator) as ProviderId;
    const model = entry.id.slice(separator + 1);

    if (separator <= 0 || !PROVIDER_IDS.includes(provider) || !model) {
      console.warn(`AI_MODELS entry has an invalid id: ${entry.id}`);
      continue;
    }

    models.push(
      toChatModel(provider, model, {
        name: typeof entry.name === "string" ? entry.name : undefined,
        description:
          typeof entry.description === "string" ? entry.description : undefined,
        reasoningTag:
          typeof entry.reasoningTag === "string" ? entry.reasoningTag : undefined,
      })
    );
  }

  return models;
}

/**
 * Synchronous default model id - safe to call from server components during
 * render because it never touches the network.
 */
export function getDefaultChatModelId(): string {
  const explicit = env("DEFAULT_CHAT_MODEL");

  if (explicit) {
    return explicit;
  }

  const overrides = getModelOverrides();

  if (overrides.length > 0) {
    return overrides[0].id;
  }

  for (const provider of getConfiguredProviders()) {
    if (provider === "compatible") {
      const [first] = getCompatibleModelOverrides();

      if (first) {
        return qualifyModelId(provider, first);
      }

      continue;
    }

    const [seed] = SEED_MODELS[provider];

    if (seed) {
      return qualifyModelId(provider, seed);
    }
  }

  return UNCONFIGURED_MODEL_ID;
}

export function getTitleModelId(): string {
  return env("TITLE_MODEL") ?? getDefaultChatModelId();
}

export function getArtifactModelId(): string {
  return env("ARTIFACT_MODEL") ?? getDefaultChatModelId();
}

export function getSeedModels(provider: ProviderId): string[] {
  if (provider === "compatible") {
    return getCompatibleModelOverrides();
  }

  return SEED_MODELS[provider];
}
