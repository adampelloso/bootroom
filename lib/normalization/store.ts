import type { FixtureBundle } from "./pipeline";
import type { NormalizedSnapshot } from "./types";

export interface NormalizationStore {
  writeSnapshot(snapshot: NormalizedSnapshot): Promise<void>;
  writeFixtureBundle(bundle: FixtureBundle): Promise<void>;
  getLatestSnapshot(): NormalizedSnapshot | null;
}

export function createInMemoryStore(): NormalizationStore {
  let latestSnapshot: NormalizedSnapshot | null = null;
  const bundles: FixtureBundle[] = [];

  return {
    async writeSnapshot(snapshot) {
      latestSnapshot = snapshot;
    },
    async writeFixtureBundle(bundle) {
      bundles.push(bundle);
    },
    getLatestSnapshot() {
      return latestSnapshot;
    },
  };
}
