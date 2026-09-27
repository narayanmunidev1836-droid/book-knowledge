/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Signed image URLs are immutable (?v=<updatedAt>), so the optimizer can
    // keep its output for a year instead of the 4h default.
    minimumCacheTTL: 31536000,
    // Next 16 blocks local sources with a query string unless the pattern is
    // listed here — omitting `search` allows any query (our ?v=&s= tokens).
    localPatterns: [
      { pathname: "/api/img/**" },
      { pathname: "/uploads/**" },
    ],
  },
};

export default nextConfig;
