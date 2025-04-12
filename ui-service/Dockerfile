FROM node:23-slim AS builder

WORKDIR /app

# Install dependencies with cache optimization
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./

# Install dependencies
RUN npm ci

# Create necessary directories
RUN mkdir -p public src

# Copy source files and configs
COPY src/ ./src/
COPY .eslintrc.* ./
COPY postcss.config.* ./
COPY components.json ./

# Build the application
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
RUN npm run build

# Production stage
FROM node:23-slim AS runner

WORKDIR /app

# Create necessary directories first
RUN mkdir -p public .next

# Set up non-root user with proper home directory
RUN mkdir -p /home/nextjs && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs nextjs && \
    chown -R nextjs:nodejs /app /home/nextjs

# Switch to non-root user
USER nextjs

# Copy only the necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Install production dependencies only
ENV NODE_ENV=production
ENV HOME=/home/nextjs
ENV HOSTNAME=0.0.0.0
RUN npm ci --only=production

# Clean npm cache
RUN npm cache clean --force

# Set environment variables
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 