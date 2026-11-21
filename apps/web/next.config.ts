import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const monorepoRoot = fileURLToPath(new URL("../../", import.meta.url));

const config: NextConfig = {
  // le package de cartouche est publié en TypeScript source dans le monorepo
  transpilePackages: ["@press-hire/cartridge", "@press-hire/engine", "@press-hire/agent"],
  outputFileTracingRoot: monorepoRoot,
  // cartouches de démo embarquées pour fonctionner même sans base
  outputFileTracingIncludes: {
    "/[slug]": ["../../fixtures/cartridges/*.json"],
    "/api/health": ["../../fixtures/cartridges/*.json"],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default config;
