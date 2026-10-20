# Live demo: Fly.io + Vercel

The site is a static React app on Vercel. The API and WebSockets run on one
small Fly machine. Postgres is a free Neon database. Redis is a free Upstash
database.

Do not run `fly postgres create` or create Fly Managed Postgres. That starts
at about $38 a month. The only paid piece in this guide is the Fly machine,
about $3.69 a month in Ashburn because `fly.toml` keeps it awake.

File uploads stay off. They need S3, and the board does not.

## Cost

| Piece | What to pick | Cost |
| --- | --- | --- |
| Vercel | Hobby plan | $0 |
| Upstash Redis | Free database | $0 |
| Neon Postgres | Free project, direct connection string | $0 |
| Fly API machine | `shared-cpu-1x`, 512 MB, always on | about $3.69/month |

Installing CLIs and creating accounts does not charge you. Billing starts when
`fly deploy` leaves the machine running. Delete it later with
`fly apps destroy cardroom`.

## Tools

1. [Git](https://git-scm.com/downloads)
2. [Node.js 20+](https://nodejs.org/)
3. [Fly CLI](https://fly.io/docs/flyctl/install/) for Windows:
   `powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"`
4. Accounts: [Fly](https://fly.io/app/sign-up), [Vercel](https://vercel.com/signup), [Neon](https://neon.tech), [Upstash](https://upstash.com/)
5. This repo pushed to GitHub

```powershell
git --version
node --version
fly version
fly auth login
```

## 1. Push the code

From the repo root, commit and push `fly.toml`, `vercel.json`, and
`apps/server/prisma/migrations`. Vercel deploys from GitHub. Fly deploys from
this folder.

If the name `cardroom` is already taken on Fly, change `app` in `fly.toml`
to something unique, such as `cardroom-yourname`, before `fly launch`.

## 2. Create the free databases

**Neon.** Create a project. Copy the **direct** connection string, the host
that does **not** contain `-pooler`. It looks like:

```text
postgresql://USER:PASSWORD@ep-something.region.aws.neon.tech/neondb?sslmode=require
```

Prisma migrations need that direct URL.

**Upstash.** Create a Redis database and choose the **Free** plan, not Pay as
you go. Copy the `rediss://` URL.

## 3. Create the Fly app and secrets

From the repo root:

```powershell
fly launch --no-deploy --copy-config
```

If Fly asks to add Postgres, say no.

Generate two different JWT secrets. Run this twice:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Set secrets. Paste your real Neon and Upstash URLs. The site URL is a
placeholder until Vercel exists. No trailing slash.

```powershell
fly secrets set `
  DATABASE_URL="postgresql://USER:PASSWORD@ep-something.region.aws.neon.tech/neondb?sslmode=require" `
  REDIS_URL="rediss://default:TOKEN@HOST.upstash.io:6379" `
  JWT_ACCESS_SECRET="first-secret" `
  JWT_REFRESH_SECRET="second-secret" `
  CORS_ORIGIN="https://placeholder.vercel.app"
```

Deploy. The release command runs `prisma migrate deploy` and creates the tables.

```powershell
fly deploy
fly status
fly open /health
```

`/health` should show `{"status":"ok"}`. The hostname is `https://<app-name>.fly.dev`.

Seed the demo account (`demo@collab.dev` / `demo-password`, room code `demo1234`):

```powershell
fly ssh console -C "./node_modules/.bin/tsx apps/server/prisma/seed.ts"
```

## 4. Deploy the site on Vercel

Import the GitHub repo. If the form does not match `vercel.json`, set:

- Framework preset: Vite
- Root directory: repository root, not `apps/web`
- Build command: `npm run build -w @collab/shared && npm run build -w @collab/web`
- Output directory: `apps/web/dist`

Production environment variables. Use the hostname from `fly status`:

```text
VITE_API_URL=https://cardroom.fly.dev
VITE_WS_URL=https://cardroom.fly.dev
```

Deploy and copy the Vercel URL, for example `https://cardroom.vercel.app`.

## 5. Allow the site to call the API

```powershell
fly secrets set CORS_ORIGIN="https://cardroom.vercel.app"
fly deploy
```

The value must match the browser address bar exactly, with `https://` and no
trailing slash. Two origins are comma-separated:

```text
https://cardroom.vercel.app,https://tandem.yourdomain.com
```

`VITE_` changes need a new Vercel deployment. Fly secret changes need
`fly deploy`.

## 6. Check the live demo

1. Open the Vercel URL.
2. Click **Use the demo account** and sign in.
3. Join room `demo1234`.
4. In a second browser, sign up and join the same code.
5. Drag a card. The other window should move.

That Vercel URL is the resume link.

## If it fails

- **Health check never passes.** `fly logs`. A missing `DATABASE_URL`,
  `REDIS_URL`, or JWT secret makes the process exit on boot.
- **Browser requests fail.** `VITE_API_URL` was wrong when Vercel built, or
  `CORS_ORIGIN` does not exactly match the Vercel URL.
- **Login works, the board spins.** `VITE_WS_URL` must be the Fly `https://`
  host. Vercel cannot host this socket.
- **Demo password is rejected.** Run the seed command again.
- **Migration fails on Neon.** You used the pooled URL. Switch `DATABASE_URL`
  to the direct host and run `fly deploy` again.
