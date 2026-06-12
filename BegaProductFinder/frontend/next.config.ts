import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avyre-spinx-test.s3.us-west-2.amazonaws.com',
        pathname: '/userfiles/images/**',
      },
    ],
  },
};

export default nextConfig;
