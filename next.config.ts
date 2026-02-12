import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Raiz do projeto: evita aviso de múltiplos lockfiles (ex.: um na pasta do projeto e outro em pasta pai)
    root: ".",
  },
};

export default nextConfig;
