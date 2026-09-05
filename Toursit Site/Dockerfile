# Build stage for React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Production server stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
# Copy compiled frontend from build stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD [node, server.js]
