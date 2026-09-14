/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  transpilePackages: ["@galaxia/ui", "@galaxia/astro", "@galaxia/vela", "@galaxia/core"],
  // Retired Quick Chart URLs. Explicit exception to ENGINEERING.md §2
  // (core next.config is otherwise frozen): bookmarks and older shares
  // still hit these paths. Do not add a root Vercel config file.
  async redirects() {
    return [
      { source: "/quick-chart", destination: "/chart", permanent: true },
      { source: "/app/quick-chart", destination: "/chart", permanent: true },
    ];
  },
};

export default nextConfig;
