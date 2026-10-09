/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@stripe/stripe-js": false,
      "@stripe/crypto": false,
      "@farcaster/mini-app-solana": false,
      "@solana/web3.js": false,
      "pino-pretty": false,
      lokijs: false,
      encoding: false,
    };
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp:
          /^(@farcaster\/mini-app-solana|@stripe\/stripe-js|@solana\/web3\.js|pino-pretty|lokijs|encoding)$/,
      })
    );
    return config;
  },
};

export default nextConfig;
