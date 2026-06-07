import type { NextConfig } from "next";

/**
 * When deploying to GitHub Pages the app lives at:
 *   https://<user>.github.io/<repo>/
 *
 * NEXT_PUBLIC_BASE_PATH is injected by the GitHub Actions workflow.
 * Locally it is unset, so the app runs at / as normal.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static HTML export — required for GitHub Pages (no Node server)
  output: "export",

  // Sub-path the site lives under on GitHub Pages
  basePath,

  // Next.js Image Optimization requires a server; disable for static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
