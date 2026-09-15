import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
