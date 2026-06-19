import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["finncenter.name.vn"],
  // Keep `next build` from overwriting the route manifest of a running dev server.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
