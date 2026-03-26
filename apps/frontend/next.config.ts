import type { NextConfig } from "next"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

const nextConfig: NextConfig = {
  // ── Silence monorepo root detection warning ──────────────────────────────
  turbopack: {
    root: __dirname,
  },

  // ── Images — local public/ files + Cloudinary ────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',  // for member claim documents/images
      },
    ],
  },

  // ── API proxy rewrite ────────────────────────────────────────────────────
  async rewrites() {
    return {
      beforeFiles: [
        {
          source:      "/api/:path*",
          destination: `${BACKEND_URL}/api/:path*`,
        },
      ],
      afterFiles:  [],
      fallback:    [],
    }
  },

  // ── Keep-alive headers — prevent ECONNRESET on proxied API requests ──────
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Connection", value: "keep-alive"          },
          { key: "Keep-Alive", value: "timeout=30, max=100" },
        ],
      },
    ]
  },

  // ── Misc ─────────────────────────────────────────────────────────────────
  poweredByHeader: false,
}

export default nextConfig