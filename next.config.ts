import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN devices to load Next.js dev assets (HMR / _next/*).
  allowedDevOrigins: ["192.168.1.111"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.iconify.design",
        pathname: "/game-icons/**",
      },
    ],
  },
};

export default nextConfig;
