import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "zqvuwncemjsdjxudqkpt.supabase.co",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  output: "standalone",
  rewrites: async () => ({
    beforeFiles: [
      {
        source: '/_next/static/chunks/app/:folder*/@:slotName/:path*',
        destination: '/_next/static/chunks/app/:folder*/%40:slotName/:path*',
      },
    ],
    afterFiles: [],
    fallback: [],
  }),
};

export default nextConfig;
