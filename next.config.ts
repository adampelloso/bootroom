import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force nft to include workerd-compatible files that it otherwise misses
  // (nft traces using "node" conditions but esbuild re-bundles with "workerd")
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@libsql/client/lib-esm/web.js",
      "./node_modules/@libsql/isomorphic-ws/web.mjs",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prepend "workerd" so webpack resolves the Cloudflare Workers-compatible
      // entry points for packages that declare a "workerd" export condition
      // (e.g. @libsql/client, @libsql/isomorphic-ws). Falls through to
      // standard conditions for packages without workerd exports (stripe, etc.).
      const defaults = ["node", "import", "require", "default"];
      config.resolve.conditionNames = [
        "workerd",
        ...(config.resolve.conditionNames ?? defaults),
      ];
    }
    return config;
  },
};

export default nextConfig;
