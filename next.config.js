/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    REACT_APP_SEPOLIA: process.env.REACT_APP_SEPOLIA,
  },
};

module.exports = nextConfig;
