FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY server/package.json server/
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src src
COPY content content
COPY maps maps
COPY tools tools
COPY server server
RUN npm run build:server && install -d -o 65532 -g 65532 /data

FROM node:24-bookworm-slim AS runtime-deps
WORKDIR /app
COPY package*.json ./
COPY server/package.json server/
RUN npm ci --workspace @szprycha/rankings --omit=dev --no-audit --no-fund

FROM gcr.io/distroless/nodejs24-debian13:nonroot
WORKDIR /app
ENV RANKING_HOST=0.0.0.0 RANKING_DB=/data/rankings.sqlite
COPY --from=build --chown=65532:65532 /app/server/dist ./dist
COPY --from=build --chmod=644 /app/server/package.json ./package.json
COPY --from=runtime-deps /app/node_modules/zod ./node_modules/zod
COPY --from=build --chown=65532:65532 /data /data
USER 65532:65532
EXPOSE 8787
CMD ["dist/main.js"]
