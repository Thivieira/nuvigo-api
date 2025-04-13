FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Rebuild the source code only when needed
FROM deps AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create directory structure for Prisma generated files
RUN mkdir -p app/generated/prisma/client

# Generate Prisma client and types
RUN npm run prisma:generate

# Build the application
RUN npm run build

# Production image, copy all the files and run
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3333 \
    HOSTNAME=0.0.0.0

# Create a non-root user and set up permissions
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser && \
    chown -R appuser:nodejs /app

# Copy application files with proper ownership
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
COPY --from=builder --chown=appuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=appuser:nodejs /app/app/generated ./app/generated

USER appuser

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3333/health || exit 1

CMD ["node", "dist/index.js"]