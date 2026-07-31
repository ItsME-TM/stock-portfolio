# Stage 1: Build the React client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Set up the backend server and bundle client static files
FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --only=production
COPY server/ ./

# Copy compiled frontend from Stage 1 into the relative path expected by Express
COPY --from=client-builder /app/client/dist /app/client/dist

# Create temporary upload directory inside container
RUN mkdir -p /tmp/uploads

# Expose port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "index.js"]
