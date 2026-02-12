import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // turbopack.root removido aqui: na Vercel não há múltiplos lockfiles e pode atrapalhar o build
};

export default nextConfig;
