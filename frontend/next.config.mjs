// The browser only ever talks to this Next.js origin. /api/<db>/* is proxied server-side to the
// matching Express backend, so session cookies stay first-party (SameSite=Strict) and no CORS is needed.
const MYSQL_API_URL = process.env.MYSQL_API_URL || "http://127.0.0.1:4001";
const SUPABASE_API_URL = process.env.SUPABASE_API_URL || "http://127.0.0.1:4002";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

export default {
  reactStrictMode: true,
  poweredByHeader: false,
  // Docker builds a self-contained server (.next/standalone); local dev/start are unaffected.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  async rewrites() {
    return [
      { source: "/api/mysql/:path*", destination: `${MYSQL_API_URL}/api/:path*` },
      { source: "/api/supabase/:path*", destination: `${SUPABASE_API_URL}/api/:path*` },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
