import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // optional: makes static URLs end with /
};

export default nextConfig;
