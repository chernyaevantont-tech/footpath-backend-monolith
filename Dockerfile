# Multi-stage build for optimal Docker image size

# Build stage
FROM node:18-alpine AS builder

# Install bash for wait-for-it script
RUN apk add --no-cache bash

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (both production and development)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

# Install bash for wait-for-it script
RUN apk add --no-cache bash

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy wait-for-it script to /usr/local/bin to avoid being treated as a module
COPY --from=builder /usr/src/app/wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Expose port
EXPOSE 3000

# Set NODE_ENV
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/main.js"]