/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ["@electric-sql/pglite", "pg", "bcryptjs"],
  },
};

export default nextConfig;
