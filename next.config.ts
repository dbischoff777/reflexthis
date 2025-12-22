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
    // Tree-shake heavy packages
    optimizePackageImports: [
      'lucide-react',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'three',
      'postprocessing',
    ],
  },
  
  // Turbopack config (Next.js 16+ default bundler for dev)
  turbopack: {},
  
  // Webpack optimizations for production builds
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split Three.js into its own chunk for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          three: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: 'three-vendor',
            chunks: 'all',
            priority: 30,
          },
          postprocessing: {
            test: /[\\/]node_modules[\\/]postprocessing[\\/]/,
            name: 'postprocessing',
            chunks: 'all',
            priority: 25,
          },
        },
      };
    }
    return config;
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
      // Cache static assets aggressively
      {
        source: '/animation/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sounds/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
