import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["finncenter.name.vn"],
  devIndicators: false,
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
