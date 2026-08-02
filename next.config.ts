import { withBotId } from "botid/next/config";
import type { NextConfig } from "next";

// BotID only does anything on Vercel's platform and injects its own routes and
// client script, so a self-hosted deployment opts in explicitly.
const botIdEnabled = process.env.ENABLE_BOTID?.trim() === "true";

const nextConfig: NextConfig = {
  cacheComponents: true,
  env: {
    NEXT_PUBLIC_ENABLE_BOTID: botIdEnabled ? "true" : "false",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default botIdEnabled ? withBotId(nextConfig) : nextConfig;
