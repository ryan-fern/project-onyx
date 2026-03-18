import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // On Vercel, VERCEL_URL is auto-set (without protocol). Use it as fallback
    // so NextAuth can construct URLs during build even if NEXTAUTH_URL isn't set.
    NEXTAUTH_URL:
      process.env.NEXTAUTH_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  },
};

export default nextConfig;
