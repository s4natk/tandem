# Ship the demo tonight

The live app is the React site on Vercel and the API plus WebSockets on Fly.io.
Postgres and Redis are still required. AWS stays a design document. You do not
need to deploy ECS, RDS, or ElastiCache to put a link on your resume.

File uploads stay off until you add an S3 bucket. The board, auth, presence,
and activity feed do not need S3.

## Tools to install

Install these on your machine before you start:

1. [Git](https://git-scm.com/downloads)
2. [Node.js 20+](https://nodejs.org/)
3. [Fly CLI](https://fly.io/docs/flyctl/install/)
4. A [Fly.io](https://fly.io/app/sign-up) account
5. A [Vercel](https://vercel.com/signup) account
6. An [Upstash](https://upstash.com/) account for Redis (free tier is enough)
7. The GitHub repo already connected to this folder

You do not need Docker or an AWS account for the public demo.

Check the CLIs:

```powershell
git --version
node --version
fly version
```

Sign in:

```powershell
fly auth login
```

Vercel can be deployed from the website. The CLI is optional.

## 1. Push this code

Commit the migration, `fly.toml`, and `vercel.json`, then push to GitHub.

If the Fly app name `cardroom` is taken, change `app` in `fly.toml` to
something unique, such as `cardroom-yourname`, before the next step.

## 2. Create the Fly API

From the repo root:

```powershell
fly launch --no-deploy --copy-config
```

Accept the existing `fly.toml`. Do not let Fly add its own Postgres yet if it
offers a different plan you do not want. You will attach a database yourself
in the next step.

```powershell
fly postgres create --name cardroom-db --region iad
fly postgres attach cardroom-db
```

`attach` sets `DATABASE_URL` on the app.

Create a free Redis database in the Upstash console and copy its Redis URL.
It usually starts with `rediss://`.

Generate two different secrets in PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Run that twice. Then:

```powershell
fly secrets set JWT_ACCESS_SECRET="paste-first-secret" JWT_REFRESH_SECRET="paste-second-secret" REDIS_URL="rediss://paste-upstash-url" CORS_ORIGIN="https://placeholder.vercel.app"
```

`CORS_ORIGIN` is updated after Vercel gives you the real site URL.

Deploy the API. The release command applies the Prisma migration.

```powershell
fly deploy
```

Check it:

```powershell
fly open /health
```

You should see `{"status":"ok",...}`.

Seed the demo user. This creates `demo@collab.dev` / `demo-password` and room
code `demo1234`.

```powershell
fly ssh console -C "./node_modules/.bin/tsx apps/server/prisma/seed.ts"
```

## 3. Create the Vercel site

In Vercel: Add New, Project, import the GitHub repo.

Use these settings if it does not read `vercel.json`:

- Framework preset: Vite
- Root directory: the repository root, not `apps/web`
- Build command: `npm run build -w @collab/shared && npm run build -w @collab/web`
- Output directory: `apps/web/dist`

Environment variables, set for Production:

```text
VITE_API_URL=https://cardroom.fly.dev
VITE_WS_URL=https://cardroom.fly.dev
```

Use your real Fly hostname if the app name is not `cardroom`. Find it with
`fly status`.

Deploy. Copy the Vercel URL, for example `https://cardroom.vercel.app`.

## 4. Connect the site to the API

```powershell
fly secrets set CORS_ORIGIN="https://cardroom.vercel.app"
fly deploy
```

No trailing slash. If you add a custom domain later, set both origins in one
value separated by a comma:

```text
https://cardroom.vercel.app,https://cardroom.yourdomain.com
```

Changing `VITE_` variables requires a new Vercel deployment. Changing Fly
secrets requires `fly deploy`.

## 5. Prove the demo

1. Open the Vercel URL.
2. Click **Use the demo account** and sign in.
3. Open room code `demo1234`.
4. Open a second browser, create another account, and join `demo1234`.
5. Drag a card in one window and confirm the other window moves.
6. Put the Vercel URL on the README, resume, and LinkedIn.

## If something fails

- **Fly health check never goes green.** Run `fly logs`. The usual cause is a
  missing `DATABASE_URL`, `REDIS_URL`, or JWT secret. The process exits
  immediately when those are empty.
- **The site loads and every request fails.** `VITE_API_URL` was wrong at
  build time, or `CORS_ORIGIN` does not exactly match the Vercel URL.
- **Login works, the board never loads.** The WebSocket URL must be the Fly
  `https://` host, not the Vercel host. Vercel does not serve this socket.
- **Migration says tables already exist.** Only on an old local database. On
  Fly this should be a fresh Postgres. Locally, run
  `npx prisma migrate resolve --applied 20261014033000_init --schema apps/server/prisma/schema.prisma`.
- **Demo login says invalid password.** The seed did not run. Run the `fly ssh`
  command again.

## Cost tonight

Vercel Hobby and Upstash's free Redis database are $0. One small Fly machine
plus the smallest Fly Postgres is usually a few dollars if you leave them on,
or under about $10 for the month. Stop the demo later with `fly scale count 0`
and by pausing the Postgres cluster in the Fly dashboard.

## What you are not doing tonight

Do not deploy the ECS, RDS, ElastiCache, and CloudFront design. That write-up
is `docs/AWS_DEPLOYMENT.md`. S3 file upload, email, and cursor-level editing
are optional follow-ups. The recruiting demo is the shared board.
