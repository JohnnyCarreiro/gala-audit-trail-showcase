import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Transpile the workspace package — Next bundles it via its own loader,
  // and without this hint it won't follow the workspace symlink.
  transpilePackages: ["@gala-audit-trail/result-helpers"],
};

export default config;
