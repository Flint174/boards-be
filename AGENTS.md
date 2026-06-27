# AGENTS

Rules for automated agents in this repository.

## Project Overview

**boards-be** — REST API для управления досками (boards), построенный на Fastify + TypeORM + PostgreSQL.

## Tech Stack

- **Runtime:** Node.js 20, TypeScript (ES modules)
- **Framework:** Fastify 5 (`withTypeProvider<ZodTypeProvider>()`)
- **ORM:** TypeORM 0.3 с PostgreSQL (pg)
- **Validation:** Zod (body, params, query, response schemas)
- **Auth:** JWT via @fastify/jwt + bcrypt
- **Dev:** tsx for hot-reload
- **Serialization:** `fastify-type-provider-zod` (validatorCompiler + serializerCompiler)
- **File Upload:** `@fastify/multipart` (multipart form-data, max 5MB)
- **File Serving:** `@fastify/static` (serves from `public/` via `/uploads/` prefix)

## Architecture

```
src/
  config/         # Database connection (TypeORM DataSource)
  constants/      # Shared error strings, response objects, pagination constants
  controllers/    # Request handlers (validation → service → response)
  entities/       # TypeORM entities (User, Room, Card, Board, Comment)
  init/           # Seed scripts (admin user)
  plugins/        # Fastify plugins (auth middleware)
  routes/v1/      # Route definitions with prefix mounting
  schemas/        # Zod validation schemas (entity-specific + shared pagination)
  services/       # Business logic and DB operations
  types/          # Custom TypeScript type definitions (fastify.d.ts)
  index.ts        # App entry point (server bootstrap)
  public/         # Uploaded files served via @fastify/static
```

### Layer Responsibilities

| Layer       | Responsibility                                  | Files              |
| ----------- | ----------------------------------------------- | ------------------ |
| Routes      | Register endpoints, attach hooks (authenticate) | `routes/v1/*.ts`   |
| Controllers | Validate input, call services, format responses | `controllers/*.ts` |
| Services    | Business logic, DB queries via repositories     | `services/*.ts`    |
| Entities    | TypeORM entity definitions with decorators      | `entities/*.ts`    |
| Schemas     | Zod schemas for request/response validation     | `schemas/*.ts`     |

## Entities & Relationships

### Entities (all registered in `AppDataSource`)

| Entity  | Table    | PK             | Key relations                                              |
| ------- | -------- | -------------- | ---------------------------------------------------------- |
| User    | users    | id (increment) | rooms (owner), cards (owner), boards (owner), comments     |
| Room    | rooms    | id (increment) | owner (User), users (ManyToMany), boards                   |
| Board   | boards   | id (increment) | room (Room), owner (User), cards                           |
| Card    | cards    | id (increment) | board (Board), owner (User), voters (ManyToMany), comments |
| Comment | comments | id (increment) | card (Card), author (User), parent (Comment → replies)     |

### Auth chain

```
Room → Board → Card → Comment
```

All access control checks follow this chain: to access a Board/Card/Comment, the user must be a member of the Room.

### Comment specifics

- `Comment.parent` — self-referencing ManyToOne for replies (nullable)
- `Comment.replies` — inverse OneToMany for children
- `parentId` column is auto-created by TypeORM from `@ManyToOne`, NOT declared in entity
- API returns all comments flat (root + replies), client builds the tree via `parent.id`
- Deletion rules: owner | card owner | board owner | room owner | admin

## Pagination

All list endpoints use shared pagination from `src/schemas/pagination.schema.ts`:

```ts
// Query params (all coerce strings → numbers, default page=1, limit=20)
paginationQuerySchema: {
  page: number;
  limit: number;
}

// Response meta shape
metaResponseSchema: {
  total: number;
  page: number;
  limit: number;
}
```

**Response format:** `{ success: true, data: [...], meta: { total, page, limit } }`

- Entity schemas import and compose via `.merge()` or direct alias
- Services return `{ items, total, page, limit }` from `findAndCount`

## Authorization — Delete Operations

| Resource | Allowed to delete                                         |
| -------- | --------------------------------------------------------- |
| Room     | admin, room owner                                         |
| Board    | admin, room owner, board owner                            |
| Card     | admin, card owner, board owner, room owner                |
| Comment  | admin, comment owner, card owner, board owner, room owner |

All return `403 ACCESS_DENIED_RESPONSE` on denial, `404 NOT_FOUND_RESPONSE` if resource missing.

## Key Patterns

- Controllers use **module-level singleton** service instances
- Services hold **Repository** instances from `AppDataSource` (constructor initialization)
- Routes use `fastify.authenticate` hook for protected endpoints; unprotected routes (register, login, refresh-token) declared before the hook block
- Protected routes that need Fastify type inference for `params` are wrapped in `fastify.register()` with `addHook("onRequest", authenticate)`
- Zod schemas use `.coerce.number()` for params/query (URL strings), `.number()` for body (JSON)
- Shared `metaResponseSchema` reused as `meta: metaResponseSchema` in responses
- Error constants in `src/constants/responses.ts` (ERROR_RESPONSE, NOT_FOUND_RESPONSE, ACCESS_DENIED_RESPONSE, etc.)
- File upload: Controller uses `request.file()` (no body schema — multipart), service saves UUID-named files to `public/`, validates MIME (`image/*`) and file size (5MB max)
- Full-text search: Room list endpoint supports `?search=` param using PostgreSQL `to_tsvector('russian', ...) @@ plainto_tsquery('russian', ...)` with a GIN index created on startup in `index.ts`

## Essential Commands

```bash
npm run dev         # Hot-reload dev server (tsx)
npm run build       # Compile TypeScript → dist/
npm run serve       # Run compiled JS from dist/
npm run type-check  # Type-check without emitting
```

## Database

- **Config:** `src/config/database.ts`
- **Sync:** `synchronize: true` in development only
- **Migrations:** `migrations/` exists but empty
- **Entities:** User, Room, Card, Board, Comment (all `@Entity` with table names)
- **Primary keys:** All `@PrimaryGeneratedColumn("increment")` (integer, auto-increment)

## Testing

```bash
# Individual test files (requires running server + jq)
./tests/test-users.sh        # Register, login, profile, CRUD, refresh, logout
./tests/test-rooms.sh        # Room CRUD, join/leave, pagination
./tests/test-boards.sh       # Board CRUD, pagination
./tests/test-cards.sh        # Card CRUD, vote, pagination
./tests/test-comments.sh     # Comment CRUD, replies, pagination
./tests/test-files.sh        # File upload, serve, delete

# Full suite
./tests/run-all.sh
```

Test helpers: `tests/helpers.sh` provides `assert_status`, `assert_field`, `assert_has_field`, `register_and_get_token`.

## Docker

```bash
docker compose up -d    # Start PostgreSQL + backend
docker compose down     # Stop services
```

Backend on port 3000, PostgreSQL on port 5432.
`HOST` env var controls listen address (`0.0.0.0` in Docker).
`public/` directory is created and chowned to `nodejs` user in Dockerfile for file uploads.

## Environment Variables

See `.env.example`. Key vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `PORT`, `NODE_ENV`, `HOST`.

## CI/CD (GitHub Actions)

One workflow in `.github/workflows/ci-cd.yml`:

| Trigger     | Jobs                              |
| ----------- | --------------------------------- |
| Push `main` | typecheck → build & push → deploy |
| PR `main`   | typecheck only                    |

**Required GitHub Secrets:**

- `VPS_HOST` — server IP
- `VPS_USERNAME` — SSH user (boards-be)
- `VPS_SSH_KEY` — SSH private key
- `DB_USER` — PostgreSQL user for production
- `DB_PASSWORD` — PostgreSQL password for production
- `JWT_SECRET` — JWT signing secret
- `ADMIN_EMAIL` — admin email for seed
- `ADMIN_PASSWORD` — admin password for seed

**Initial VPS setup:**

1. Run `scripts/setup-vps-user.sh` as root on VPS
2. Add SSH public key to `/home/boards-be/.ssh/authorized_keys`
3. Push to `main` — workflow creates `/opt/boards-be/`, `.env`, `docker-compose.yml` and starts services

## Code Conventions

- ES modules — use `.js` extension in imports
- Strict TypeScript, no `any`
- Decorators enabled for TypeORM
- No comments in code unless explicitly requested
- Descriptions in schemas/routes in russian
- Error handling — controllers return appropriate HTTP status codes with `{ success: false, error: string }`
- Use `instanceof Error` checks with `ERRORS` constants for error type discrimination
- Shared response constants (`ACCESS_DENIED_RESPONSE`, `NOT_FOUND_RESPONSE`, etc.) from `src/constants/responses.ts`
- Pagination: always use `findAndCount` (or `createQueryBuilder` + `getManyAndCount`) with `skip`/`take`, return `{ items, total, page, limit }` from service

## Response compression

Response format: Be extremely concise. Answer in 1–2 short sentences, English only, no explanations or fluff.

## Code Style

- Use `jsdoc` to describe components, helpers, hooks, types and their properties
- TypeScript without `any`.
- Clear names, short functions, readability over abstractions.
- Follow SOLID.
- Write docs, comments and swagger descriptions in code in russian
