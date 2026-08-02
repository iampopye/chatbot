/**
 * Isomorphic model types and helpers.
 *
 * This module must stay free of `process.env` access and of any provider SDK
 * import, because it is bundled into the browser. All environment-dependent
 * logic lives in `lib/ai/config.ts` (server only) and reaches the client via
 * the `/api/models` route.
 */

export const PROVIDER_IDS = [
  "anthropic",
  "openai",
  "groq",
  "openrouter",
  "compatible",
  "gateway",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  groq: "Groq",
  openrouter: "OpenRouter",
  compatible: "Self-hosted",
  gateway: "AI Gateway",
};

export type ChatModel = {
  /** Fully qualified id, `provider:model`. */
  id: string;
  name: string;
  description?: string;
  provider: ProviderId;
  providerLabel: string;
  /**
   * When set, model output wrapped in `<tag>...</tag>` is surfaced as
   * reasoning rather than as message text.
   */
  reasoningTag?: string;
};

export type ModelCatalog = {
  models: ChatModel[];
  defaultModel: string;
};

/**
 * Last-resort id used when no provider is configured at all, so the UI has
 * something coherent to render instead of crashing.
 */
export const UNCONFIGURED_MODEL_ID = "compatible:not-configured";

function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

/**
 * Split a qualified model id on its FIRST colon.
 *
 * The first-colon rule matters: Ollama tags (`llama3.1:8b`) contain colons and
 * OpenRouter ids (`anthropic/claude-3.5-sonnet`) contain slashes, so neither a
 * last-colon split nor a slash split would be safe.
 */
export function parseModelId(
  id: string
): { provider: ProviderId; model: string } | null {
  const separator = id.indexOf(":");

  if (separator <= 0) {
    return null;
  }

  const provider = id.slice(0, separator);
  const model = id.slice(separator + 1);

  if (!(isProviderId(provider) && model)) {
    return null;
  }

  return { provider, model };
}

export function qualifyModelId(provider: ProviderId, model: string): string {
  return `${provider}:${model}`;
}

/** Group a catalog by provider label, preserving catalog order. */
export function groupModelsByProvider(
  models: ChatModel[]
): [string, ChatModel[]][] {
  const groups = new Map<string, ChatModel[]>();

  for (const model of models) {
    const existing = groups.get(model.providerLabel);

    if (existing) {
      existing.push(model);
    } else {
      groups.set(model.providerLabel, [model]);
    }
  }

  return [...groups.entries()];
}

export function findModel(
  models: ChatModel[],
  id: string | undefined
): ChatModel | undefined {
  if (!id) {
    return;
  }

  return models.find((model) => model.id === id);
}
