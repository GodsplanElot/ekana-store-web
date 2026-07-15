import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (supabaseUrl) {
  try {
    const storageUrl = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: storageUrl.protocol === "http:" ? "http" : "https",
      hostname: storageUrl.hostname,
      port: storageUrl.port,
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // Invalid environment values are reported by the Supabase client at runtime.
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
