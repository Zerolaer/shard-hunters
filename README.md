# Shard Hunters

Browser idle/action RPG (Next.js). Cloud accounts via Neon PostgreSQL + JWT cookies; deploy on Vercel.

## Stack

- **Next.js 16** App Router
- **Neon** PostgreSQL (`@neondatabase/serverless` + Drizzle ORM)
- **Auth**: email + password (bcrypt), session JWT in httpOnly cookie
- **Saves**: JSON blob per user (`/api/save`), localStorage as cache

## Local setup

1. Copy env and fill values:

```bash
copy .env.example .env.local
```

Required variables:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Neon connection string (`?sslmode=require`) |
| `AUTH_SECRET` | Random string ≥16 chars for signing session cookies |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

2. Install & push schema:

```bash
npm install
npm run db:push
```

3. Run:

```bash
npm run dev
```

Open http://localhost:3000 — register with email, hunter name, and password (min 6 chars).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ email, name, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| POST | `/api/auth/logout` | Clear session cookie |
| GET | `/api/auth/me` | Current user or `null` |
| GET | `/api/save` | Cloud save JSON |
| PUT | `/api/save` | `{ data }` — zustand persist payload |

## Neon

1. Create a project at [console.neon.tech](https://console.neon.tech)
2. Copy the **pooled** connection string into `DATABASE_URL`
3. Run `npm run db:push` (local) or connect the same URL on Vercel and run push once from your machine

Optional CLI:

```bash
npx neonctl auth
npx neonctl projects create --name shard-hunters
```

## GitHub

```bash
gh auth login
gh repo create shard-hunters --private --source=. --remote=origin --push
```

Use `--public` if you want an open repo. Never commit `.env` / `.env.local`.

## Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) (or `npx vercel`)
2. Set Environment Variables (Production + Preview):
   - `DATABASE_URL` — same Neon URL
   - `AUTH_SECRET` — same secret as local (or a dedicated production secret)
3. Deploy. After first deploy, ensure tables exist (`npm run db:push` against that DB).

CLI sketch:

```bash
npx vercel login
npx vercel link
npx vercel env add DATABASE_URL
npx vercel env add AUTH_SECRET
npx vercel --prod
```

## Play

1. Open the Vercel URL
2. **Регистрация** → email, имя охотника, пароль
3. Progress autosaves to Neon (debounced); localStorage keeps a cache for fast load
