import type { NextConfig } from "next";

const config: NextConfig = {
  // Next.js 16 uses Turbopack by default for dev & build.
  // Keep the config light — we intentionally do not configure
  // legacy webpack rules, AMP, or runtime configs (removed in 16).
  reactStrictMode: true,
  experimental: {
    // Cache Components are opt-in in Next 16.
    // cacheComponents: true,
  },
};

export default config;
