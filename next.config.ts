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
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
