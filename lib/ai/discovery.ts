/**
 * Runtime model discovery.
 *
 * Rather than shipping a hardcoded model list that goes stale, the app asks
 * each configured provider what it can serve. Results are cached in-process
 * for a few minutes. Every failure path degrades to the provider's seed list
 * so the picker is never empty.
 *
 * Server-only: see the note in `lib/ai/config.ts`.
 */

import { createGateway } from "@ai-sdk/gateway";
import {
  type ChatModel,
  type ModelCatalog,
  type ProviderId,
} from "./models";
import {
  getApiKey,
  getBaseUrl,
  getConfiguredProviders,
  getDefaultChatModelId,
  getModelOverrides,
  getSeedModels,
  toChatModel,
} from "./config";

const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

/** Ids that are not chat models, filtered out of permissive listings. */
const NON_CHAT_MODEL =
  /(embed|whisper|tts|audio|speech|transcrib|dall-?e|moderation|rerank|image|video|guard|vision-encoder)/i;

type CacheEntry = {
  expiresAt: number;
  models: ChatModel[];
};

const cache = new Map<ProviderId, CacheEntry>();

type ListedModel = {
  id: string;
  name?: string;
  description?: string;
};

async function fetchJson(
  url: string,
  headers: Record<string, string>
): Promise<unknown> {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/** Both OpenAI-style (`{data:[...]}`) and bare-array listings. */
function readListing(payload: unknown): ListedModel[] {
  const container =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data: unknown }).data
      : payload;

  if (!Array.isArray(container)) {
    return [];
  }

  const models: ListedModel[] = [];

  for (const entry of container) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const id = record.id ?? record.name;

    if (typeof id !== "string" || !id) {
      continue;
    }

    models.push({
      id,
      name:
        typeof record.display_name === "string"
          ? record.display_name
          : typeof record.name === "string"
            ? record.name
            : undefined,
      description:
        typeof record.description === "string" ? record.description : undefined,
    });
  }

  return models;
}

async function discoverFromProvider(
  provider: ProviderId
): Promise<ListedModel[]> {
  const apiKey = getApiKey(provider);
  const baseUrl = getBaseUrl(provider);

  if (provider === "gateway") {
    const { models } = await createGateway({ apiKey }).getAvailableModels();

    return models.map((model) => ({
      id: model.id,
      name: model.name,
      description: model.description ?? undefined,
    }));
  }

  if (!baseUrl) {
    return [];
  }

  if (provider === "anthropic") {
    const payload = await fetchJson(`${baseUrl}/models?limit=100`, {
      "x-api-key": apiKey ?? "",
      "anthropic-version": "2023-06-01",
    });

    return readListing(payload);
  }

  const headers: Record<string, string> = {};

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return readListing(await fetchJson(`${baseUrl}/models`, headers));
}

function seedCatalog(provider: ProviderId): ChatModel[] {
  return getSeedModels(provider).map((model) => toChatModel(provider, model));
}

async function getProviderModels(provider: ProviderId): Promise<ChatModel[]> {
  const cached = cache.get(provider);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.models;
  }

  let models: ChatModel[];

  try {
    const listed = await discoverFromProvider(provider);

    models = listed
      .filter((model) => !NON_CHAT_MODEL.test(model.id))
      .map((model) =>
        toChatModel(provider, model.id, {
          name: model.name,
          description: model.description,
        })
      );
  } catch (error) {
    console.warn(
      `Model discovery failed for "${provider}", using seed list:`,
      error instanceof Error ? error.message : error
    );
    models = [];
  }

  if (models.length === 0) {
    models = seedCatalog(provider);
  }

  cache.set(provider, { expiresAt: Date.now() + CACHE_TTL_MS, models });

  return models;
}

/**
 * The catalog offered to the UI. An explicit `AI_MODELS` value wins outright;
 * otherwise every configured provider is queried in parallel.
 */
export async function getModelCatalog(): Promise<ModelCatalog> {
  const defaultModel = getDefaultChatModelId();
  const overrides = getModelOverrides();

  if (overrides.length > 0) {
    return { models: overrides, defaultModel };
  }

  const providers = getConfiguredProviders();
  const results = await Promise.all(providers.map(getProviderModels));
  const models = results.flat();

  // Make sure the configured default is always selectable.
  if (models.length > 0 && !models.some((model) => model.id === defaultModel)) {
    return { models, defaultModel: models[0].id };
  }

  return { models, defaultModel };
}

/** Exposed for tests and for cache invalidation in long-running processes. */
export function clearModelCache(): void {
  cache.clear();
}
