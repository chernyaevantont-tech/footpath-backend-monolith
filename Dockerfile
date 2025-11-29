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

# Install all dependencies for running migrations
RUN npm ci

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy source files needed for migrations
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/tsconfig.json ./
COPY --from=builder /usr/src/app/wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

# Expose port
EXPOSE 3000

# Set NODE_ENV
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/main.js"]