import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@contentauth/c2pa-node', 'better-sqlite3', 'sharp'],
};

export default nextConfig;
