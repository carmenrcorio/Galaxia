/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  transpilePackages: ["@galaxia/ui", "@galaxia/astro", "@galaxia/vela"]
};

export default nextConfig;
