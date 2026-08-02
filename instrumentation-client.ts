/**
 * Vercel BotID is opt-in: it only does anything on Vercel's platform, and it
 * loads third-party client code, which a self-hosted deployment should not get
 * by default.
 */
if (process.env.NEXT_PUBLIC_ENABLE_BOTID === "true") {
  import("botid/client/core").then(({ initBotId }) => {
    initBotId({
      protect: [{ path: "/api/chat", method: "POST" }],
    });
  });
}

export {};
