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
      NEXT_PUBLIC_CREDIT: process.env.NEXT_PUBLIC_CREDIT || "Michel ESPARSA",
      NEXT_PUBLIC_R2_PUBLIC_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "",
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'sitematiere-nexjs.pages.dev',
          pathname: '**',
        },
        ...(() => {
          // Robustly handle R2 hostname from either variable
          const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
          let hostname = process.env.NEXT_PUBLIC_R2_HOSTNAME;

          if (!hostname && r2Url) {
            try {
              hostname = new URL(r2Url).hostname;
            } catch {
              // Ignore invalid URLs
            }
          }

          return hostname ? [{
            protocol: 'https' as const,
            hostname,
            pathname: '**',
          }] : [];
        })(),
        {
          protocol: 'https',
          hostname: 'res.cloudinary.com',
          pathname: '**',
        }
      ],
    },
    serverExternalPackages: ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner", "@smithy/util-stream"],
    webpack: (config, { isServer }) => {
      // Ignore Prisma WASM files in edge runtime
      if (isServer) {
        config.module = config.module || {};
        config.module.rules = config.module.rules || [];
        // Only ignore Prisma's WASM loader on Windows local dev to avoid "Unexpected character" error
        if (!process.env.CF_PAGES && process.platform === 'win32') {
          config.module.rules.push({
            test: /wasm-edge-light-loader\.mjs$/,
            use: 'ignore-loader',
          });
        }

        config.experiments = {
          ...config.experiments,
          asyncWebAssembly: true,
          layers: true,
        };
      }
      return config;
    },
  };

  return nextConfig;
};

export default config;
