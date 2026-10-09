/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@privy-io/react-auth",
      "three",
      "viem",
      "@tanstack/react-query",
      "clsx",
      "tailwind-merge",
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@farcaster/mini-app-solana": false,
      "@farcaster/frame-sdk": false,
      "@stripe/stripe-js": false,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
