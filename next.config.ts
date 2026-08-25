import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // undici + pg are loaded by Node at runtime, not bundled — the SSRF-hardened
  // fetcher needs undici's real Agent with custom DNS lookup.
  serverExternalPackages: ["undici", "pg"],
};

export default nextConfig;
