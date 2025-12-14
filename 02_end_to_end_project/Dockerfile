# Multi-stage Dockerfile for Online Interview Platform
# Stage 1: Build frontend
FROM node:25-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY interview-frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source
COPY interview-frontend/ ./

# Build frontend for production
RUN npm run build

# Stage 2: Setup backend and serve frontend
FROM node:25-alpine

WORKDIR /app

# Install production dependencies for backend
COPY interview-backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Copy backend source
COPY interview-backend/ ./

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Create a simple script to serve both backend and frontend
WORKDIR /app
RUN echo '#!/bin/sh' > start.sh && \
    echo 'cd /app/backend && node src/server.js' >> start.sh && \
    chmod +x start.sh

# Expose ports
# 3001 for backend API and WebSocket
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["/app/start.sh"]