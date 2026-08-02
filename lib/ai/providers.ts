import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";
import {
  createLanguageModel,
  getArtifactModelId,
  getModelOverrides,
  getTitleModelId,
  inferReasoningTag,
} from "./config";
import { parseModelId } from "./models";

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

/**
 * An explicit `AI_MODELS` entry always beats the id-based heuristic, so a
 * self-hosted model with an unusual name can still be marked as a reasoning
 * model.
 */
function getReasoningTag(modelId: string, model: string): string | undefined {
  const override = getModelOverrides().find((entry) => entry.id === modelId);

  if (override) {
    return override.reasoningTag;
  }

  return inferReasoningTag(model);
}

/**
 * Resolve a fully qualified `provider:model` id into a language model.
 *
 * The provider is chosen entirely from configuration - no vendor is hardcoded
 * anywhere in this codebase.
 */
export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const parsed = parseModelId(modelId);

  if (!parsed) {
    throw new Error(
      `Invalid model id "${modelId}". Expected "provider:model", for example "anthropic:claude-sonnet-4-5".`
    );
  }

  const model = createLanguageModel(parsed.provider, parsed.model);
  const reasoningTag = getReasoningTag(modelId, parsed.model);

  if (!reasoningTag) {
    return model;
  }

  return wrapLanguageModel({
    model,
    middleware: extractReasoningMiddleware({ tagName: reasoningTag }),
  });
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  return getLanguageModel(getTitleModelId());
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }

  return getLanguageModel(getArtifactModelId());
}
