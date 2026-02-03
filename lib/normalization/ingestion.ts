import type { FootballProvider, ProviderKey } from "@/lib/providers/types";
import { buildNormalizationSnapshot, type IngestionPlan } from "./pipeline";
import type { NormalizationStore } from "./store";

export async function runIngestionPlan(
  provider: FootballProvider,
  providerKey: ProviderKey,
  plan: IngestionPlan,
  store: NormalizationStore,
): Promise<void> {
  const snapshot = await buildNormalizationSnapshot(provider, providerKey, plan);
  await store.writeSnapshot(snapshot);
}
