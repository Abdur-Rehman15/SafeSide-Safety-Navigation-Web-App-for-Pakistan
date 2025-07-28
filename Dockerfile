# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend and serve frontend
FROM node:18-alpine AS backend
WORKDIR /app

# Install backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# Copy backend source
COPY backend/ ./backend/

# Copy frontend build to backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Set environment variables (override in production as needed)
ENV NODE_ENV=production

# Expose backend port
EXPOSE 5000

# Start the backend server
CMD ["node", "backend/server.js"] 