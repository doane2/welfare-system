// next.config.mjs
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

const nextConfig = {
  // -- Images: local public/ files + Cloudinary --
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  // -- API proxy rewrite --
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${BACKEND_URL}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    }
  },

  // -- Keep-alive headers: prevent ECONNRESET on proxied API requests --
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Connection", value: "keep-alive" },
          { key: "Keep-Alive", value: "timeout=30, max=100" },
        ],
      },
    ]
  },

  poweredByHeader: false,
}

export default nextConfig