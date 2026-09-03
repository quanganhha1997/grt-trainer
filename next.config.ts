import type { NextConfig } from "next";

const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = isGitHubPagesBuild
  ? {
      // GitHub Pages serves static files and cannot run the Sites Worker.
      output: "export",
      // Directory-style routes keep /routines/ and /form-check/ refresh-safe.
      trailingSlash: true,
      images: {
        unoptimized: true,
      },
    }
  : {};

export default nextConfig;
