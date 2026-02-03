import { mockFootballProvider } from "./mock-provider";
import type { FootballProvider, ProviderDescriptor, ProviderKey } from "./types";

interface ProviderEntry {
  descriptor: ProviderDescriptor;
  provider: FootballProvider;
  ready: boolean;
}

const PROVIDERS: Record<ProviderKey, ProviderEntry> = {
  mock: {
    descriptor: { key: "mock", label: "Mock provider", isMock: true },
    provider: mockFootballProvider,
    ready: true,
  },
  "api-football": {
    descriptor: { key: "api-football", label: "API-Football", isMock: false },
    provider: mockFootballProvider,
    ready: false,
  },
};

export interface ResolvedProvider {
  requestedKey: ProviderKey;
  activeKey: ProviderKey;
  provider: FootballProvider;
  isFallback: boolean;
}

export function resolveProvider(requestedKey: ProviderKey = "mock"): ResolvedProvider {
  const entry = PROVIDERS[requestedKey];
  if (entry?.ready) {
    return {
      requestedKey,
      activeKey: requestedKey,
      provider: entry.provider,
      isFallback: false,
    };
  }

  const fallback = PROVIDERS.mock;
  return {
    requestedKey,
    activeKey: "mock",
    provider: fallback.provider,
    isFallback: true,
  };
}

export function listProviderDescriptors(): ProviderDescriptor[] {
  return Object.values(PROVIDERS).map((entry) => entry.descriptor);
}
