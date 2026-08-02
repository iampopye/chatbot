# syntax=docker/dockerfile:1

# =============================================================================
# Self-Hosted AI Chat
#
# Deliberately does NOT bake any provider key or database URL into the image.
# Everything is supplied at run time, so one image works against any provider
# and any Postgres.
# =============================================================================

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app


# --- build ------------------------------------------------------------------
FROM base AS builder

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

# A placeholder is enough to compile; the real secret is injected at run time.
# No provider key is set here, which is also a check that the build never
# depends on one.
ENV AUTH_SECRET=build-time-placeholder
RUN pnpm build


# --- runtime ----------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs --create-home nextjs

# The dev dependencies are kept because migrations run through tsx at start-up.
# Correctness over image size: a smaller image that cannot migrate is worse.
COPY --from=builder --chown=nextjs:nodejs /app /app

COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/ping').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["pnpm", "start"]
