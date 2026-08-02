/**
 * OpenTelemetry is opt-in. A self-hosted deployment should not emit telemetry
 * anywhere unless its operator asks for it.
 */
export async function register() {
  if (process.env.ENABLE_OTEL?.trim() !== "true") {
    return;
  }

  const { registerOTel } = await import("@vercel/otel");

  registerOTel({ serviceName: process.env.OTEL_SERVICE_NAME ?? "ai-chat" });
}
