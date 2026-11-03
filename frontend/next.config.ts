import type { NextConfig } from "next";

// The browser only talks to this app. /api/* is forwarded to the backend (AGENTS.md §2),
// so the login cookie stays on one domain.
const backend = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
