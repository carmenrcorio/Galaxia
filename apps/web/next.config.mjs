/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@galaxia/ui"],
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
