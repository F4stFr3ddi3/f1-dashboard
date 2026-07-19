# F1 Dashboard

A dark-themed, mobile-friendly F1 dashboard showing driver/constructor
standings, the season schedule with a countdown to the next race
(including circuit maps), and results from the most recently completed
race.

Built as a static site (vanilla HTML/CSS/JS, no build step, no framework)
deployed on a **Cloudflare Worker**, using the Worker's built-in static
assets binding to serve `public/` and a small router in `src/worker.js`
for the API routes. Data comes from the free
[Jolpica F1 API](https://api.jolpi.ca/ergast/f1/) (an Ergast-compatible F1
data API).

## Project structure

```
public/             Static frontend (served via the assets binding)
  index.html
  style.css
  app.js
  data/circuits.json  Bundled top-down track outlines for the current season's circuits
src/worker.js        Worker entry point — routes /api/* requests, otherwise serves static assets
src/api/              Route handlers (plain functions, called from worker.js)
  standings.js         GET /api/standings  — driver + constructor standings (cached 1h)
  schedule.js           GET /api/schedule   — full season race schedule (cached 6h)
  results.js            GET /api/results    — results from the last completed race (cached 1h)
wrangler.toml         Cloudflare Worker config (entry point + assets binding)
package.json          npm scripts for local dev / deploy
```

## Local development

Requires [Node.js](https://nodejs.org/) and npm.

```bash
npm install
npm run dev
```

This runs `wrangler dev`, which serves the Worker locally — static files
from `public/` via the assets binding, and the `/api/*` routes handled by
`src/worker.js`. By default it's available at `http://localhost:8787`.

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

## Connecting to Cloudflare Workers

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/) and
   go to **Workers & Pages**.
2. Click **Create application** → **Workers** tab → **Import a repository**
   (or "Connect to Git", depending on the current UI wording).
3. Select the `f1-dashboard` GitHub repository you just pushed.
4. Leave the build command empty — there is no build step. Cloudflare
   reads `wrangler.toml` to find the entry point (`src/worker.js`) and the
   static assets directory (`public`) automatically.
5. Click **Save and Deploy**.
6. Every subsequent push to the connected branch should trigger an
   automatic redeploy — confirm this is enabled under
   **Settings → Builds & deployments** if it doesn't happen on its own.

Alternatively, you can deploy directly from the CLI without Git integration:

```bash
npm run deploy
```

No D1, KV, or other bindings are required for this project — the API
routes call the public Jolpica F1 API directly and cache responses using
the Cache API.

## Circuit track layouts

The top-down track outline shown on the Next Race card is rendered from
`public/data/circuits.json`, a small bundled dataset (coordinates only,
no runtime dependency) derived from the
[bacinger/f1-circuits](https://github.com/bacinger/f1-circuits) project.
It's keyed by Ergast/Jolpica `circuitId` and covers the current season's
22 circuits. If a future season adds a new circuit not in this file, the
map area will just show "Track layout not available" for that race —
regenerate the dataset by re-running the same extraction against an
updated copy of `f1-circuits.geojson` and adding the new circuit's
Ergast-id → dataset-id mapping.
