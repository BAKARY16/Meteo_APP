FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm install

FROM deps AS builder
WORKDIR /app

COPY . .
RUN npm run build --prefix frontend

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Install only backend production dependencies for a smaller runtime image.
COPY backend/package*.json ./backend/
RUN npm install --omit=dev --prefix backend

COPY backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 3600

CMD ["node", "backend/src/server.js"]