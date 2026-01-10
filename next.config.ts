import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Webpack configuration for production builds (Vercel)
  webpack: (config, { isServer }) => {
    // Add aliases to replace problematic modules with dummy implementations
    config.resolve.alias = {
      ...config.resolve.alias,
      "@mediapipe/selfie_segmentation": path.resolve(__dirname, "./lib/dummy-mediapipe.js"),
      "@100mslive/hms-virtual-background": path.resolve(__dirname, "./lib/dummy-hms-virtual-background.js"),
      "@100mslive/hms-noise-cancellation": path.resolve(__dirname, "./lib/dummy-hms-noise-cancellation.js"),
    };
    return config;
  },
  // Turbopack configuration for development
  turbopack: {
    resolveAlias: {
      // Replace @mediapipe/selfie_segmentation with dummy module
      "@mediapipe/selfie_segmentation": "./lib/dummy-mediapipe.js",
      // Ignore the broken 100ms virtual background module
      "@100mslive/hms-virtual-background": "./lib/dummy-hms-virtual-background.js",
      // Ignore noise cancellation module (version conflicts)
      "@100mslive/hms-noise-cancellation": "./lib/dummy-hms-noise-cancellation.js",
    },
  },
};

export default nextConfig;
