import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/signup",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
