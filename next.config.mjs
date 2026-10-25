/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  webpack: (config) => {
    // MediaPipe wasm is served statically from /public
    return config;
  },
};

export default nextConfig;
