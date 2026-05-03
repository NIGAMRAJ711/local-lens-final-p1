# LocalLens — Docker build (optional, for VPS/Railway/Fly.io)
FROM node:20-alpine

WORKDIR /app

# Install backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm install --legacy-peer-deps --production

# Install & build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy backend source
COPY backend/ ./backend/

# Create data and uploads dirs
RUN mkdir -p backend/data backend/uploads

WORKDIR /app/backend

EXPOSE 5001

CMD ["node", "src/index.js"]
