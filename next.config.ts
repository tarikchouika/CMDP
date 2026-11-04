import type { NextConfig } from "next";

/**
 * CMDP — إعدادات Next.js
 * - الوضع الافتراضي: خادم كامل (فرونت + API + Prisma/SQLite)
 * - CMDP_STATIC=1: نسخة ساكنة للنشر على Cloudflare Pages (وضع العرض التجريبي)
 */
const nextConfig: NextConfig = {
  ...(process.env.CMDP_STATIC
    ? {
        output: "export" as const,
        images: { unoptimized: true },
      }
    : {
        output: "standalone" as const,
      }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
