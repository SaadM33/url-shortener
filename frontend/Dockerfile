# Build stage: compile the SPA to static files.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Baked into the bundle at build time by Vite.
ARG VITE_API_URL=http://localhost:8100
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Serve stage: static files behind nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
