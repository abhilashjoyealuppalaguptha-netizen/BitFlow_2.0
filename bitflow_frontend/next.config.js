/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Monaco Editor configuration
  // ─────────────────────────────────────────────────────────────────────────
  // Monaco ships its own workers that reference 'self' (browser-only).
  // webpack must not try to bundle them for Node/server environments.
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude monaco-editor from the server bundle.
      // It is only imported inside dynamic(() => ..., { ssr: false }) wrappers.
      config.externals = [
        ...(config.externals || []),
        { "monaco-editor": "monaco-editor" },
      ];
    }
    return config;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // REMOVED: FastAPI backend rewrite
  // ─────────────────────────────────────────────────────────────────────────
  // Previously:
  //   async rewrites() {
  //     return [{
  //       source: "/api/:path*",
  //       destination: "http://127.0.0.1:8000/:path*",
  //     }];
  //   }
  //
  // This is NO LONGER NEEDED because:
  // • The app is now fully self-contained with Next.js API routes
  // • Prisma handles all database access
  // • All /api/* endpoints are defined in app/api/...
  // • No external backend is running on port 8000
};

module.exports = nextConfig;