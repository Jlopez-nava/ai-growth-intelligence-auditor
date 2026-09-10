import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Codex preview opens the local app via the loopback IP. Keep the
  // development HMR allowlist narrow rather than permitting arbitrary origins.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
