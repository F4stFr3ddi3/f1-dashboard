# F1 Dashboard

A dark-themed, mobile-friendly F1 dashboard showing driver/constructor
standings, the season schedule with a countdown to the next race, and
results from the most recently completed race.

Built as a static site (vanilla HTML/CSS/JS, no build step, no framework)
deployed on **Cloudflare Pages**, with server-side data fetching handled by
**Cloudflare Pages Functions**. Data comes from the free
[Jolpica F1 API](https://api.jolpi.ca/ergast/f1/) (an Ergast-compatible F1
data API).

## Project structure

```
public/             Static frontend (served as-is)
  index.html
  style.css
  app.js
functions/api/       Cloudflare Pages Functions (serverless endpoints)
  standings.js        GET /api/standings  — driver + constructor standings (cached 1h)
  schedule.js          GET /api/schedule   — full season race schedule (cached 6h)
  results.js           GET /api/results    — results from the last completed race (cached 1h)
wrangler.toml        Cloudflare Pages project config
package.json         npm scripts for local dev / deploy
```

## Local development

Requires [Node.js](https://nodejs.org/) and npm.

```bash
npm install
npm run dev
```

This runs `wrangler pages dev public`, which serves the `public/` folder
and executes the Functions in `functions/api/` locally, just like they'd
run in production. By default it's available at `http://localhost:8788`.

## Pushing to GitHub

If this folder isn't a git repo yet:

```bash
git init
git add .
git commit -m "Initial commit: F1 dashboard"
```

Create a new repository on GitHub (via the web UI or `gh repo create`),
then push:

```bash
git remote add origin https://github.com/<your-username>/f1-dashboard.git
git branch -M main
git push -u origin main
```

## Connecting to Cloudflare Pages

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/) and
   go to **Workers & Pages**.
2. Click **Create application** → **Pages** → **Connect to Git**.
3. Select the `f1-dashboard` GitHub repository you just pushed.
4. In the build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty — there is no build step)*
   - **Build output directory:** `public`
5. Click **Save and Deploy**. Cloudflare will detect `functions/api/*.js`
   automatically and deploy them as Pages Functions alongside the static
   site — no extra configuration needed.
6. Every subsequent push to the connected branch will trigger an automatic
   redeploy.

No D1, KV, or other bindings are required for this project — the API
functions call the public Jolpica F1 API directly and cache responses
using the Cache API.
