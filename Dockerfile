# Dependencias y código: la base de las etapas de verificación y del build.
FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Las construye Jenkins antes de desplegar (docker build --target lint/prueba).
# `docker compose build` no pasa por ellas: solo usa las etapas que necesita.
FROM base AS lint
RUN npm run lint

FROM base AS prueba
# Falla si una prueba falla o si la cobertura de líneas baja del 80 %.
RUN npm run test:cov

# Compila TypeScript (con el plugin de Swagger, ver nest-cli.json).
FROM base AS build
RUN npm run build

# Imagen final: solo las dependencias de producción y el código compilado.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
