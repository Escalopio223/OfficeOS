FROM node:22-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Exponer el puerto de la API Fastify
EXPOSE 3000

ENV NODE_ENV=production
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

CMD ["npm", "run", "dev"]

