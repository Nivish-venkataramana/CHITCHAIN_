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
  webpack: (config, { webpack, isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@stripe/stripe-js": false,
      "@stripe/crypto": false,
      "@farcaster/mini-app-solana": false,
      "@farcaster/frame-sdk": false,
      "@solana/web3.js": false,
      "pino-pretty": false,
      lokijs: false,
      encoding: false,
      fs: false,
      net: false,
      tls: false,
    };
    if (webpack) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp:
            /^(@farcaster\/mini-app-solana|@stripe\/stripe-js|@solana\/web3\.js|pino-pretty|lokijs|encoding)$/,
        })
      );
    }
    return config;
  },
};

export default nextConfig;
