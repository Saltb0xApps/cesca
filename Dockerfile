# Build the React app, then ship a slim image that serves it + the API.

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist

# Served port and where the .md files live (mount a persistent volume here).
ENV PORT=8080
ENV DATA_DIR=/data
EXPOSE 8080
VOLUME ["/data"]

CMD ["node", "server/index.js"]
