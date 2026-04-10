import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid CI/Vercel failing the whole deploy on lint noise; run `npm run lint` locally.
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.svg", permanent: false }];
  },
};

export default nextConfig;
