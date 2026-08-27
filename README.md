# Recipes Monorepo — NestJS + React thực chiến

Project học **monorepo**: backend NestJS (nhiều services) + frontend React TS.  
Chủ đề: công thức nấu ăn (chefs / recipes).

---

## Kiến trúc thư mục

```
monorepo/
├── apps/
│   ├── frontend/              ← React TS (Vite) :5173
│   └── backend/
│       ├── api-gateway/       :3000
│       ├── user-service/      :3001
│       └── recipe-service/    :3002
├── libs/shared/               ← DTO/interface backend
├── docker-compose.yml
└── package.json               ← scripts + deps Nest
```

```
Browser React (apps/frontend) :5173
        │  /api → proxy
        ▼
┌───────────────────┐  :3000
│   api-gateway     │  ← cổng vào duy nhất cho FE
└─────────┬─────────┘
          │ HTTP
    ┌─────┴─────┐
    ▼           ▼
:3001        :3002
user-service  recipe-service
    ▲           │
    └───────────┘  recipe gọi user để validate author
         │              │
      users_db      recipes_db
```

| App | Port | Việc làm |
|-----|------|----------|
| `apps/frontend` | 5173 | React TS UI (Vite) |
| `apps/backend/api-gateway` | 3000 | Forward request + CORS |
| `apps/backend/user-service` | 3001 | Chefs → `users_db` |
| `apps/backend/recipe-service` | 3002 | Recipes → `recipes_db` + HTTP → user-service |
| `libs/shared` | — | DTO / interface backend (`@app/shared`) |

Tách `frontend` / `backend` trong cùng repo là đúng. FE chỉ gọi gateway, không gọi thẳng :3001/:3002.

**Database-per-service:** `users_db` / `recipes_db` tách nhau. Recipe chỉ lưu `authorId` (UUID), không FK sang users.

---

## Chạy project

```bash
npm run db:up

npm run start:users
npm run start:recipes
npm run start:gateway
npm run start:frontend     # http://localhost:5173
```

Lần đầu FE: `cd apps/frontend && npm install`.

Thứ tự: **db → users → recipes → gateway → frontend**.

Env backend: `.env.example`. Env FE: `apps/frontend/.env.example`.

---

## Demo API (qua gateway :3000)

### 1. Tạo chef

```bash
curl -s http://localhost:3000/users -H 'Content-Type: application/json' -d '{
  "name": "Lan Nguyen",
  "email": "lan@cook.dev",
  "bio": "Thích món Việt"
}'
```

Copy `id` trả về → dùng làm `authorId`.

### 2. Tạo recipe (recipe-service sẽ gọi user-service)

```bash
curl -s http://localhost:3000/recipes -H 'Content-Type: application/json' -d '{
  "title": "Phở bò",
  "description": "Phở bò truyền thống Hà Nội, nước dùng trong và thơm",
  "ingredients": [
    { "name": "Xương bò", "amount": "1kg" },
    { "name": "Bánh phở", "amount": "500g" }
  ],
  "steps": [
    "Hầm xương 6 tiếng",
    "Trụng bánh phở",
    "Chan nước dùng"
  ],
  "cookTimeMinutes": 360,
  "difficulty": "hard",
  "authorId": "PASTE_USER_ID_HERE"
}'
```

Response có `authorName` — chứng tỏ recipe-service đã gọi được user-service.

### 3. Thử lỗi: author không tồn tại

```bash
curl -s http://localhost:3000/recipes -H 'Content-Type: application/json' -d '{
  "title": "Cơm tấm",
  "description": "Cơm tấm sườn bì chả điển hình Sài Gòn",
  "ingredients": [{ "name": "Cơm tấm", "amount": "1 đĩa" }],
  "steps": ["Nướng sườn", "Xới cơm"],
  "cookTimeMinutes": 45,
  "difficulty": "easy",
  "authorId": "00000000-0000-0000-0000-000000000000"
}'
```

→ `404 Author ... not found in user-service`

### 4. List

```bash
curl -s http://localhost:3000/users
curl -s http://localhost:3000/recipes
curl -s "http://localhost:3000/recipes?authorId=USER_ID"
```

---

## File quan trọng cần đọc (theo thứ tự)

1. `libs/shared/src/` — DTO/interface share  
2. `apps/backend/user-service/src/users/` — TypeORM → `users_db`  
3. `apps/backend/recipe-service/src/recipes/` — TypeORM → `recipes_db`  
4. `apps/backend/recipe-service/src/recipes/user-client.service.ts` — HTTP sang service khác  
5. `apps/backend/api-gateway/src/proxy.service.ts` — gateway forward  
6. `docker-compose.yml` — Postgres + 2 databases  
7. `apps/frontend/src/api/client.ts` — FE gọi gateway qua `/api`  
8. `apps/frontend/src/pages/` — UI

---

## Bài tập tự làm (mentor checklist)

1. Thêm `PATCH /users/:id` cập nhật bio  
2. Thêm field `cuisine` (món Việt / Nhật / …) vào recipe + DTO shared  
3. Tắt `user-service`, tạo recipe → quan sát `502 Bad Gateway`  
4. (Nâng cao) Chuyển `UserClientService` sang NestJS `ClientProxy` + TCP  

---

## Ghi chú học

- **Monorepo** = nhiều app trong 1 repo, share code qua `libs/`  
- Gom Nest apps vào `apps/backend/` chỉ là **cách tổ chức folder** — mỗi service vẫn là process riêng  
- Mỗi service 1 DB (`users_db` / `recipes_db`) — **database-per-service**  
- `synchronize: true` chỉ để học; production dùng TypeORM migrations  
- Restart service **không** mất data (trừ khi `npm run db:reset`)
