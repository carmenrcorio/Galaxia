/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  transpilePackages: ["@galaxia/ui", "@galaxia/astro", "@galaxia/vela", "@galaxia/core"],
  // Retired URLs. Explicit exception to ENGINEERING.md §2 (core next.config
  // is otherwise frozen): bookmarks and older emails still hit these paths.
  // Do not add a root Vercel config file.
  async redirects() {
    return [
      { source: "/quick-chart", destination: "/chart", permanent: true },
      { source: "/app/quick-chart", destination: "/chart", permanent: true },
      { source: "/account/subscription", destination: "/app/settings", permanent: true },
      // Constellation-connect landing. ENGINEERING.md §2 exception, same
      // class as the retired-URL redirects above: a trailing slash must not
      // 404 a pasteable token. Kind-aware /invite → /connect lives in the
      // invite route so birth_data keeps /invite/[token].
      { source: "/connect/:token/", destination: "/connect/:token", permanent: true },
    ];
  },
};

export default nextConfig;
