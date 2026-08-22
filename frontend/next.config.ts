import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storagePathname = "/storage/v1/object/public/**";

if (supabaseUrl) {
  try {
    const storageUrl = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: storageUrl.protocol === "http:" ? "http" : "https",
      hostname: storageUrl.hostname,
      port: storageUrl.port,
      pathname: storagePathname,
    });
  } catch {
    // Invalid environment values are reported by the Supabase client at runtime.
  }
}

remotePatterns.push(
  {
    protocol: "http",
    hostname: "127.0.0.1",
    port: "54321",
    pathname: storagePathname,
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "54321",
    pathname: storagePathname,
  },
  {
    protocol: "https",
    hostname: "**.supabase.co",
    pathname: storagePathname,
  },
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
