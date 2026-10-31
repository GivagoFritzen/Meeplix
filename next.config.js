/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: process.env.NODE_ENV === "development",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

module.exports = nextConfig;