import { auth } from "@/app/(auth)/auth";
import { getModelCatalog } from "@/lib/ai/discovery";
import { ChatbotError } from "@/lib/errors";

/**
 * Serves the model catalog to the browser.
 *
 * The catalog is environment-derived, so it cannot be bundled into the client
 * at build time - the whole point is that the same build works against any
 * provider. Authentication is required so an unauthenticated visitor cannot
 * enumerate which providers this deployment has configured.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const catalog = await getModelCatalog();

  return Response.json(catalog, {
    headers: { "cache-control": "private, max-age=60" },
  });
}
