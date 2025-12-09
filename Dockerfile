# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy standalone build from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set environment variables
ENV NODE_ENV=production
# The Next.js standalone server binds to HOSTNAME and PORT
ENV HOSTNAME="0.0.0.0"
ENV PORT=10000

# Expose port
EXPOSE 10000

# Start the application
CMD ["node", "server.js"]

