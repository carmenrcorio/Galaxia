/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  transpilePackages: ["@galaxia/ui", "@galaxia/astro", "@galaxia/vela", "@galaxia/core"]
};

export default nextConfig;
