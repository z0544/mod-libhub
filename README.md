# ModLibHub — Internal Software & Libraries Repository

ModLibHub centralizes the management, versioning and distribution of software packages,
libraries, tools, IDEs and runtimes inside a closed corporate network. It provides a
single, well-organized and reliable source of approved software.

The interface is fully bilingual (Hebrew / English) with a language toggle in the
navbar. Hebrew is the default and renders right-to-left (RTL); English renders
left-to-right (LTR).

## Features

- **Catalog & search** — browse software/libraries by category, full-text search,
  filter by stable versions, grid/list views, popular & recently-added sorting.
- **Hierarchical categories** — top-level categories with sub-categories (e.g. a
  single **NPM** parent grouping 15 sub-categories and ~140 libraries).
- **Versioning** — multiple versions per item, "recommended/stable" flag, release
  notes (Markdown), JSON metadata, file size and per-version download counters.
- **Secure downloads** — files streamed from the server with download tracking.
- **Admin dashboard** — manage items, versions and categories; storage/usage stats.
- **Recycle bin** — soft-delete for items and categories with restore & permanent-delete.
- **Roles** — Admin (full management) and Viewer (browse & download), JWT-based, AD-ready.
- **Bilingual UI** — Hebrew (RTL) / English (LTR) with light & dark themes.
- **Offline-first** — no external CDN/runtime dependency; ships with an offline,
  step-by-step internal-server deployment guide and scripts.

## Tech Stack

| Layer        | Technology                                                             |
| ------------ | ---------------------------------------------------------------------- |
| Frontend     | React 19 · Vite · TypeScript · Tailwind CSS · shadcn-style UI · TanStack Query · React Router v7 |
| Backend      | Node.js 22 · Express · TypeScript                                      |
| Database     | PostgreSQL 18                                                          |
| ORM          | Prisma                                                                 |
| Validation   | Zod                                                                    |
| File storage | Local filesystem                                                       |
| Auth         | JWT (local users, AD-ready)                                            |
| Markdown     | react-markdown                                                         |

## Project Structure

```
mod-libhub/
├── apps/
│   ├── api/                 # Express + Prisma backend
│   │   ├── prisma/          # schema.prisma + seed.ts
│   │   ├── src/
│   │   │   ├── config/      # env config
│   │   │   ├── lib/         # prisma, auth, storage, errors…
│   │   │   ├── middleware/  # auth + error handling
│   │   │   └── routes/      # auth, categories, items, versions, download, dashboard
│   │   └── uploads/         # uploaded files (gitignored)
│   └── web/                 # React + Vite frontend
│       └── src/
│           ├── components/  # UI primitives + layout
│           ├── context/     # auth + theme
│           ├── hooks/       # TanStack Query hooks
│           ├── lib/         # api client, types, utils
│           └── pages/       # browse, item detail, login, admin/*
├── scripts/deploy/          # offline deployment scripts (PowerShell)
└── package.json             # npm workspaces root
```

## Deployment (internal / offline server)

For deploying to an internal Windows server **without internet access**, see the
step-by-step guide: **[`INSTALLS/DEPLOYMENT.md`](INSTALLS/DEPLOYMENT.md)**.

In production the API process also serves the built website (single Node process,
no Docker / nginx needed) — set `WEB_DIST_DIR` in the environment. See
`apps/api/.env.production.example`.

Default login: **admin / Admin123!** (and a read-only **viewer / Viewer123!**).

## Local Development

You need Node.js 22+ and a running PostgreSQL 18 instance.

### 1. Install dependencies (from the repo root)

```bash
npm install
```

### 2. Configure the API environment

```bash
cp apps/api/.env.example apps/api/.env
# edit DATABASE_URL to point to your PostgreSQL instance
```

### 3. Set up the database

```bash
npm run db:generate    # generate Prisma client
npm run db:migrate     # create tables (prisma migrate dev)
npm run db:seed        # load categories + sample items + admin user
```

> If you prefer not to use migrations during early development, you can run
> `npx prisma db push` inside `apps/api` instead of `db:migrate`.

### 4. Run both apps

```bash
npm run dev            # starts API (:4000) and Web (:5173) together
```

- Web dev server: http://localhost:5173 (proxies `/api` to the backend)
- API: http://localhost:4000

### Useful scripts (root)

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Run API + Web in parallel                |
| `npm run build`        | Build both apps                          |
| `npm run typecheck`    | Type-check both apps                     |
| `npm run db:migrate`   | Run Prisma migrations (dev)              |
| `npm run db:seed`      | Seed database                            |
| `npm run db:reset`     | Reset database and reseed                |

## API Overview

| Method | Endpoint                          | Access | Description                       |
| ------ | --------------------------------- | ------ | --------------------------------- |
| POST   | `/api/auth/login`                 | Public | Authenticate, returns JWT         |
| GET    | `/api/auth/me`                    | Auth   | Current user                      |
| GET    | `/api/categories`                 | Public | List categories                   |
| POST   | `/api/categories`                 | Admin  | Create category                   |
| PUT    | `/api/categories/:id`             | Admin  | Update category                   |
| DELETE | `/api/categories/:id`             | Admin  | Delete category                   |
| GET    | `/api/items`                      | Public | List/search items (`search`, `category`, `stable`, `sort`) |
| GET    | `/api/items/:slug`                | Public | Item detail                       |
| GET    | `/api/items/:slug/versions`       | Public | Item versions                     |
| POST   | `/api/items`                      | Admin  | Create item                       |
| PUT    | `/api/items/:id`                  | Admin  | Update item                       |
| DELETE | `/api/items/:id`                  | Admin  | Delete item (+ versions & files)  |
| POST   | `/api/items/:itemId/versions`     | Admin  | Upload a version (multipart)      |
| PUT    | `/api/item-versions/:id`          | Admin  | Update version metadata           |
| DELETE | `/api/item-versions/:id`          | Admin  | Delete version (+ file)           |
| GET    | `/api/download/:versionId`        | Public | Download file (increments counter)|
| GET    | `/api/dashboard/stats`            | Admin  | Dashboard metrics                 |

## Notes

- **File storage:** uploaded artifacts are stored on the filesystem (`UPLOAD_DIR`);
  only their path/size is kept in the database. This keeps the DB small and backups fast.
- **Offline:** no external CDN or runtime network dependency.
- **AD integration (Phase 2):** the `users` table already includes `ad_id`; only the
  password-check step in `/auth/login` needs to be swapped for an AD lookup.
