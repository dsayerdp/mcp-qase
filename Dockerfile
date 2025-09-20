# syntax=docker/dockerfile:1

FROM node:22-slim AS builder

WORKDIR /app

# Install all dependencies (including dev) to build the TypeScript project.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PATH="/app/node_modules/.bin:${PATH}"

# Install only production dependencies for the runtime image.
COPY package.json package-lock.json ./
# Skip prepare script here (build already copied from builder stage)
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/build ./build

# Install mcp-proxy to expose the server over the MCP protocol.
RUN npm install -g mcp-proxy@2.10.6

USER node

CMD ["mcp-proxy", "node", "./build/index.js"]
