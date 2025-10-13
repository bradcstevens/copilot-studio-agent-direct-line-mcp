# =============================================================================
# Multi-stage Dockerfile for Copilot Studio Agent Direct Line MCP Server
# Optimized for Azure Container Apps with security best practices
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# Install production dependencies only with security hardening
# -----------------------------------------------------------------------------
FROM node:18-alpine AS deps

# Install security updates and CA certificates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache ca-certificates && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies with optimal settings
# - Use npm ci for reproducible builds
# - Only production dependencies
# - Clean cache to reduce image size
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 2: Builder
# Build TypeScript application with build optimizations
# -----------------------------------------------------------------------------
FROM node:18-alpine AS builder

# Install security updates
RUN apk update && \
    apk upgrade && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
# Use npm ci for reproducible builds
RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

# Copy TypeScript configuration and source code
# Copying separately for better layer caching
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
# Output goes to ./dist directory
RUN npm run build

# Verify build output
RUN ls -la dist/ && \
    test -f dist/index.js || (echo "Build failed: dist/index.js not found" && exit 1)

# Remove dev dependencies after build to reduce final image size
RUN npm prune --production

# -----------------------------------------------------------------------------
# Stage 3: Runtime
# Minimal runtime image with only necessary files
# -----------------------------------------------------------------------------
FROM node:18-alpine AS runtime

# Install security updates and dumb-init for proper signal handling
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files and dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/package*.json ./

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy environment example (for reference)
COPY --chown=nodejs:nodejs .env.example ./.env.example

# Create directory for session storage (if using file storage)
RUN mkdir -p /app/.sessions && \
    chown -R nodejs:nodejs /app/.sessions

# Switch to non-root user
USER nodejs

# Expose port (will be set via environment variable)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${MCP_SERVER_PORT:-3000}/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# Metadata labels
LABEL maintainer="Copilot Studio MCP Team"
LABEL description="MCP server for Microsoft Copilot Studio Agent integration via Direct Line 3.0"
LABEL version="1.0.5"

# -----------------------------------------------------------------------------
# Stage 4: Development
# Development image with dev dependencies and hot reload
# -----------------------------------------------------------------------------
FROM node:18-alpine AS development

# Install security updates
RUN apk update && apk upgrade

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start in development mode with hot reload
CMD ["npm", "run", "dev"]
