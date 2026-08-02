/**
 * Liveness probe for container orchestration.
 *
 * Deliberately does not touch the database or any provider, so it reports
 * whether the server process is up rather than whether every dependency is.
 */
export function GET() {
  return Response.json(
    { status: "ok" },
    { headers: { "cache-control": "no-store" } }
  );
}
