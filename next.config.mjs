/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  typedRoutes: true,
  async headers() {
    return [
      {
        source: "/weather-sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          }
        ]
      },
      {
        source: "/:asset*.(png|jpg|jpeg|webp|avif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
