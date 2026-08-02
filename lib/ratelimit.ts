import { createClient } from "redis";

import { isProductionEnvironment } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";

const MAX_MESSAGES_PER_DAY = 10;
const TTL_SECONDS = 60 * 60 * 24;

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client && process.env.REDIS_URL) {
    client = createClient({ url: process.env.REDIS_URL });

    // Surface connection problems rather than swallowing them - a silently
    // dead Redis means rate limiting is silently off.
    client.on("error", (error) => {
      console.warn("Redis rate-limit client error:", error);
    });

    client.connect().catch((error) => {
      console.warn("Redis rate-limit connection failed:", error);
      client = null;
    });
  }

  return client;
}

/**
 * Rate limiting is best-effort: if Redis is unavailable the request is allowed
 * through rather than failing the chat. Only the rate-limit decision itself
 * propagates.
 */
export async function checkIpRateLimit(ip: string | undefined) {
  if (!isProductionEnvironment || !ip) {
    return;
  }

  const redis = getClient();

  if (!redis?.isReady) {
    return;
  }

  try {
    const key = `ip-rate-limit:${ip}`;
    const [count] = await redis
      .multi()
      .incr(key)
      .expire(key, TTL_SECONDS, "NX")
      .exec();

    if (typeof count === "number" && count > MAX_MESSAGES_PER_DAY) {
      throw new ChatbotError("rate_limit:chat");
    }
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }

    console.warn("Rate limit check failed, allowing request:", error);
  }
}
