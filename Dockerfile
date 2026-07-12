# syntax=docker/dockerfile:1

# ---- Stage 1: build the frontend -----------------------------------------
FROM node:20-alpine AS web-build
WORKDIR /app/web
COPY web/package.json web/package-lock.json* ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---- Stage 2: backend + built frontend ------------------------------------
FROM node:20-alpine
WORKDIR /app

COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=web-build /app/web/dist ./public

# The user's project lives in a mounted volume at /workspace -- that's the
# "current directory" cowork operates on (workspace = process.cwd()).
RUN mkdir -p /workspace
WORKDIR /workspace

ENV PORT=5175
EXPOSE 5175

# No DEEPSEEK_API_KEY is required to start the container -- configure it
# afterwards from the Settings tab in the UI (persisted to
# /workspace/.agent/.env), or pass DEEPSEEK_API_KEY as a container env var.
CMD ["node", "/app/bin/cowork.js", "serve"]
