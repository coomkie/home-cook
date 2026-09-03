# Home-cook Monorepo

Learning monorepo: **NestJS microservices** + **React TS** + Docker.  
Product vision: [specs.md](specs.md) (Home-cook).

> Specs V1 prefers a modular monolith; this repo keeps **microservices** for learning HTTP between services.

## Current scope

- Auth + profile (JWT), i18n en/vi
- **Recipe Studio**: draft/publish, ingredient catalog (seed + user propose → MOD approve), step/cover media via **MinIO presign**, exclusive **sub-recipe** steps + bottom-sheet preview

After recipe schema changes:

```bash
npm run db:reset
```

Promote moderator (ingredient queue at `/studio/moderation`):

```sql
-- users_db
INSERT INTO user_roles (user_id, role)
SELECT id, 'MODERATOR' FROM users WHERE email = 'you@example.com';
```

## Run local

```bash
cp .env.example .env
npm run db:up
npm run start:users
npm run start:recipes
npm run start:gateway
npm run start:frontend
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Gateway / Swagger | http://localhost:3000 · /api/docs |
| MinIO console | http://localhost:9001 (minioadmin/minioadmin) |
| Mailpit | http://localhost:8025 |

Create recipes from **Studio** (`/studio`). Public list only shows `PUBLISHED` recipes.
