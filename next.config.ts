import { PHASE_PRODUCTION_BUILD, PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import type { NextConfig } from "next";

// Function to increment version in package.json
const autoIncrementVersion = (phase: string) => {
  const pkgPath = path.join(process.cwd(), "package.json");

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

    // Only increment during a production build
    const isBuild = phase === PHASE_PRODUCTION_BUILD;
    if (!isBuild) return pkg.version;

    // Prevent re-incrementing in worker processes or during reloads
    // Next.js spawns multiple processes; we only want the main one to increment
    if (process.env.NEXT_PRIVATE_WORKER || process.env.NEXT_IS_RELOAD === 'true') {
      return pkg.version;
    }

    // Double-check with a temporary file lock to ensure only one increment per 5 seconds
    // This handles cases where the main process might evaluate the config multiple times
    const lockDir = path.join(process.cwd(), "node_modules", ".cache");
    if (!fs.existsSync(lockDir)) {
      fs.mkdirSync(lockDir, { recursive: true });
    }
    const lockPath = path.join(lockDir, "version_increment.lock");

    if (fs.existsSync(lockPath)) {
      const lastIncrement = parseInt(fs.readFileSync(lockPath, "utf8"), 10);
      if (Date.now() - lastIncrement < 5000) {
        return pkg.version;
      }
    }

    // Perform increment
    const versionParts = pkg.version.split('.');
    if (versionParts.length === 3) {
      versionParts[2] = (parseInt(versionParts[2], 10) + 1).toString();
      pkg.version = versionParts.join('.');

      // Save back to package.json
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
      // Update lock
      fs.writeFileSync(lockPath, Date.now().toString(), "utf8");

      return pkg.version;
    }
    return pkg.version;
  } catch (e) {
    return "0.0.1";
  }
};

export default (phase: string) => {
  const version = autoIncrementVersion(phase);

  // Get git commit hash (short)
  let gitCommit = "no-git";
  try {
    gitCommit = execSync("git rev-parse --short HEAD", { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
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
