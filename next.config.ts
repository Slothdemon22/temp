import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Turbopack configuration
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
