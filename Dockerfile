# Single Render web service: FastAPI (internal) + Next.js (public)
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libpq5 \
    wget \
  && rm -rf /var/lib/apt/lists/*

# Python API deps
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r /tmp/requirements.txt \
  && rm /tmp/requirements.txt

# App
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY backend/app ./backend/app
COPY start.sh ./start.sh
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV PYTHONPATH=/app/backend
ENV SHELFWISE_API_ORIGIN=http://127.0.0.1:8331
ENV PORT=10000
EXPOSE 10000

CMD ["/app/start.sh"]
