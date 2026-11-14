import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/tools/ai-tco-calculator/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '') + "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'" + (process.env.NODE_ENV === 'development' ? ' ws://localhost:3000 ws://127.0.0.1:3000' : '') + "; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    }];
  },
  async redirects() {
    return [
      { source: "/about", destination: "/#about", permanent: true },
      { source: "/spanforge", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
