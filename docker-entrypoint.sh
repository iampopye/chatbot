#!/bin/sh
set -e

if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" = "build-time-placeholder" ]; then
  echo "ERROR: AUTH_SECRET is not set. Generate one with: openssl rand -base64 32" >&2
  exit 1
fi

if [ -z "$POSTGRES_URL" ]; then
  echo "ERROR: POSTGRES_URL is not set." >&2
  exit 1
fi

echo "Applying database migrations..."
pnpm db:migrate

echo "Starting server on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec "$@"
