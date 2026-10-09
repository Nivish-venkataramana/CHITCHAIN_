import { createRequire } from "module";
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  transpilePackages: [
    "@privy-io/react-auth",
    "@headlessui/react",
  ],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "three",
      "viem",
      "@tanstack/react-query",
      "clsx",
      "tailwind-merge",
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-aria/interactions": require.resolve("@react-aria/interactions"),
      "@react-aria/focus": require.resolve("@react-aria/focus"),
    };
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
