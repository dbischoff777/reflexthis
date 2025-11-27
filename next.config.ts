import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for production
  compress: true,
  
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Output standalone for Electron packaging
  output: 'standalone',
  
  // Ensure static files are properly handled in standalone build
  distDir: '.next',
  
  // Ensure basePath is not set (causes issues with static file serving)
  basePath: undefined,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
