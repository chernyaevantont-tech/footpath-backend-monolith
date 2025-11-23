# Multi-stage build for optimal Docker image size

# Build stage
FROM node:18-alpine AS builder

# Install bash for wait-for-it script
RUN apk add --no-cache bash

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

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

# Copy production dependencies from builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy source files for debugging (optional, can be removed for smaller image)
COPY --from=builder /usr/src/app/src ./src

# Copy wait-for-it script
COPY --from=builder /usr/src/app/wait-for-it.sh ./
RUN chmod +x wait-for-it.sh

# Expose port
EXPOSE 3000

# Set NODE_ENV
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/main.js"]