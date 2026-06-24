# Стадия 1: Сборка
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
COPY tsconfig.json ./

# Устанавливаем зависимости (включая dev зависимости для сборки)
RUN npm ci

# Копируем исходный код
COPY src ./src

# Сборка TypeScript в JavaScript
RUN npm run build

# Стадия 2: Production
FROM node:20-alpine

WORKDIR /app

# Создаем пользователя без прав (безопасность)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Копируем только production зависимости
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Копируем собранные файлы из стадии builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Директория для загружаемых файлов
RUN mkdir -p /app/public && chown nodejs:nodejs /app/public

# Переключаемся на непривилегированного пользователя
USER nodejs

# Открываем порт приложения
EXPOSE 3000

ENV DOCKER=true

# Запускаем приложение
CMD ["node", "dist/index.js"]