import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  // 允许 127.0.0.1 访问 dev 资源（截图/调试工具常用），仅影响 dev server
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
