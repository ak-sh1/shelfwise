import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.cursor.com",
    "*.cursor.sh",
    "*.cursorshare.com",
    "*.trycloudflare.com",
    "*.cloudflare.com",
    "*.onrender.com",
  ],
};

export default nextConfig;
