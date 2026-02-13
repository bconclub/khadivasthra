import type { NextConfig } from "next";
import path from "path";

const projectRoot = __dirname;

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  turbopack: {},
  // Exclude admin routes from static export (they require server-side rendering)
  // Admin panel should be accessed directly via PHP server
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  webpack: (config) => {
    // Explicitly set the project root for module resolution
    // This ensures PostCSS can resolve tailwindcss correctly
    if (config.resolve) {
      // Set context to project root to ensure module resolution works correctly
      config.context = projectRoot;
      // Ensure node_modules resolution starts from project root
      const projectNodeModules = path.join(projectRoot, 'node_modules');
      if (!config.resolve.modules) {
        config.resolve.modules = [];
      }
      // Prepend project node_modules to ensure correct resolution
      const existingModules = Array.isArray(config.resolve.modules) ? config.resolve.modules : [];
      config.resolve.modules = [
        projectNodeModules,
        ...existingModules.filter((m: any) => typeof m === 'string' && m !== 'node_modules' && !m.includes(projectRoot)),
        'node_modules'
      ];
      // Also set resolveLoader
      if (!config.resolveLoader) {
        config.resolveLoader = {};
      }
      if (!config.resolveLoader.modules) {
        config.resolveLoader.modules = [];
      }
      const existingLoaderModules = Array.isArray(config.resolveLoader.modules) ? config.resolveLoader.modules : [];
      config.resolveLoader.modules = [
        projectNodeModules,
        ...existingLoaderModules.filter((m: any) => typeof m === 'string' && m !== 'node_modules' && !m.includes(projectRoot)),
        'node_modules'
      ];
    }
    return config;
  },
};

export default nextConfig;
