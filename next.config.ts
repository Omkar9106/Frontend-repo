import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  telemetry: {
    enabled: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8001/api/:path*',
      },
      {
        source: '/test',
        destination: 'http://127.0.0.1:8001/test',
      },
    ];
  },
};

// Enable HTTPS in development for camera access
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export default nextConfig;
