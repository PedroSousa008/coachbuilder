import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL:
      process.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL ?? "sousa.2003pedro@gmail.com",
  },
  // Avoid CI/Vercel failing the whole deploy on lint noise; run `npm run lint` locally.
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.svg", permanent: false }];
  },
};

export default nextConfig;
