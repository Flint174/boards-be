# boards-be

REST API для управления досками.

## Технологии

- Node.js 20, Fastify, TypeScript
- PostgreSQL, TypeORM
- JWT аутентификация
- Docker Compose

## Запуск проекта

### 1. Подготовка

Клонировать репозиторий

```bash
git clone <repo-url>
cd boards-be
```

Скопировать и настроить .env

```bash
cp .env.example .env
```

При необходимости отредактируйте переменные в .env

### 2. Запуск через Docker

```bash
docker compose up -d
```

Сервис будет доступен: `http://localhost:3000`

При обновлении проекта из репозитория следует удалить из докера старый образ и заново пересобрать

```bash
docker compose up -d --build
```

Если обновлялась структура базы, то также следует удалить старую базу из volumes докера. Новая база будет создана заново после запуска образа

### 3. Локальная разработка

```bash
npm install
npm run dev
```

## Тестирование

Для тестирования API используется bash-скрипт:

```bash
./tests/run-all.sh
```

### Требования для тестирования

- Установленный `jq` (для парсинга JSON)
- Запущенный сервер (`docker compose up -d` или `npm run dev`)

## API Endpoints

Доступен swagger после запуска проекта по `http://localhost:3000/docs`

### Файлы

| Метод    | Путь                      | Описание                                  |
| -------- | ------------------------- | ----------------------------------------- |
| `POST`   | `/api/v1/files/upload`    | Загрузка изображения (multipart, max 5MB) |
| `DELETE` | `/api/v1/files/:filename` | Удаление файла                            |
| `GET`    | `/uploads/:filename`      | Получение файла (без авторизации)         |

Загруженные файлы сохраняются в директорию `public/` с UUID-именем. Разрешены только изображения (`image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/avif`, `image/tiff`, `image/bmp`).

### Полнотекстовый поиск

Комнаты поддерживают полнотекстовый поиск по `name` и `description` через PostgreSQL `tsvector`:

```
GET /api/v1/rooms?search=текст_для_поиска
```

Поиск работает через `to_tsvector('russian', ...)` / `plainto_tsquery('russian', ...)` с GIN-индексом, создаваемым при старте приложения.

## Остановка

```bash
docker compose down
```
