import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["finncenter.name.vn"],
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
