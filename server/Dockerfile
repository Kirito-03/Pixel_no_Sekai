# Netflix Clone Backend - Dockerfile
# Node.js 20 Alpine para imagen ligera
FROM node:20-alpine

# Metadata
LABEL maintainer="Netflix Clone App"
LABEL description="Backend API for Netflix Clone application"

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias primero (mejor cache de layers)
COPY package*.json ./

# Instalar dependencias de producción
# npm ci es más rápido y reproducible que npm install
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar el resto del código fuente
COPY . .

# Crear directorios necesarios para uploads y contenido
RUN mkdir -p uploads/avatars hls videos && \
    chown -R node:node /app

# Cambiar a usuario no-root por seguridad
USER node

# Exponer puerto
EXPOSE 3001

# Health check interno (Docker lo usa para verificar container health)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio
CMD ["node", "index.js"]
