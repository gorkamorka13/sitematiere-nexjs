import type { NextConfig } from "next";
import { execSync } from "child_process";

// Get git commit hash (short)
let gitCommit = "no-git";
try {
  gitCommit = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.warn("Could not fetch git commit hash");
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.1.0",
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
    NEXT_PUBLIC_BUILD_DATE: new Date().toLocaleDateString("fr-FR"),
    NEXT_PUBLIC_CREDIT: "Michel ESPARSA",
  },
};

export default nextConfig;
