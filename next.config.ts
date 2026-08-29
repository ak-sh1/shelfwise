import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.SHELFWISE_API_ORIGIN?.replace(/\/$/, "") ||
  "http://127.0.0.1:8331";

const nextConfig: NextConfig = {
  // Dev server was started on 0.0.0.0 / localhost; Cursor previews often hit 127.0.0.1
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.cursor.com",
    "*.cursor.sh",
    "*.cursorshare.com",
    "*.trycloudflare.com",
    "*.cloudflare.com",
    "*.vercel.app",
  ],
  async rewrites() {
    const origin = (
      process.env.SHELFWISE_API_ORIGIN || API_ORIGIN
    ).replace(/\/$/, "");
    // Skip localhost proxy on Vercel unless a hosted API origin is configured.
    if (process.env.VERCEL && /127\.0\.0\.1|localhost/.test(origin)) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${origin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
