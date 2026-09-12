const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [{
      source: "/api/:path*",
      destination: `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:5080"}/api/:path*`,
    }];
  },
};

export default nextConfig;
