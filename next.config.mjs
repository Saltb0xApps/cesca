/** @type {import('next').NextConfig} */
const nextConfig = {
  // Drawings are stored as base64 PNG data URLs in SQLite, which can get large.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
