import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Allow requests, adjust this to your allowed origins
  hostname: '0.0.0.0',
  experimental: {
    serverMinification: false
  }
};

export default config;
