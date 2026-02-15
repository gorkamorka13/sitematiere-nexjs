import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

// Function to get version from package.json
const getVersion = () => {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return pkg.version;
  } catch {
    return "0.1.0";
  }
};

const config = () => {
  const version = getVersion();

  // Get git commit hash (short)
  let gitCommit = "no-git";
  try {
    gitCommit = execSync("git rev-parse --short HEAD", { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    // Silent fallback
  }

  const nextConfig: NextConfig = {
    env: {
      NEXT_PUBLIC_APP_VERSION: version,
      NEXT_PUBLIC_GIT_COMMIT: gitCommit,
      NEXT_PUBLIC_BUILD_DATE: new Date().toLocaleDateString("fr-FR"),
      NEXT_PUBLIC_CREDIT: "Michel ESPARSA",
      NEXT_PUBLIC_R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || "https://pub-78c42489fd854dc3a6975810aa00edf2.r2.dev",
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'sitematiere-nexjs.pages.dev',
          pathname: '**',
        },
        {
          protocol: 'https',
          hostname: 'pub-78c42489fd854dc3a6975810aa00edf2.r2.dev',
          pathname: '**',
        },
        {
          protocol: 'https',
          hostname: 'res.cloudinary.com',
          pathname: '**',
        }
      ],
    },
    serverExternalPackages: ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner", "@smithy/util-stream"],
  };

  // Seed logic moved to a separate script or managed via prisma seed

  return nextConfig;
};

export default config;
