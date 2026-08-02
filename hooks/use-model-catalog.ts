"use client";

import useSWR from "swr";
import type { ChatModel, ModelCatalog } from "@/lib/ai/models";
import { fetcher } from "@/lib/utils";

const EMPTY_MODELS: ChatModel[] = [];

/**
 * The model catalog is environment-derived on the server, so the browser
 * fetches it instead of having it inlined at build time. That is what lets a
 * single build serve any provider.
 */
export function useModelCatalog() {
  const { data, isLoading } = useSWR<ModelCatalog>("/api/models", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60_000,
  });

  return {
    models: data?.models ?? EMPTY_MODELS,
    defaultModel: data?.defaultModel,
    isLoading,
  };
}
