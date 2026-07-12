# cowork-app

The full `cowork` agent system as one deployable package: `server/` (the
multi-agent backend + HTTP API) and `web/` (the React/TS console), combined
so the backend serves the built UI itself -- one process, one port.

Three ways to run it, pick whichever fits:

## 1. Docker (recommended for most people)

```bash
docker compose up --build
```

Open **http://localhost:5175**. That's it -- the container starts with no
API key configured; add it from the **Settings** tab once it's up (or set
`DEEPSEEK_API_KEY` as an env var beforehand, see below).

By default it operates on the directory you ran `docker compose up` from.
To point it at a different project:

```bash
COWORK_WORKSPACE=/path/to/your/project docker compose up --build
```

Other overrides (all optional, all in a `.env` file next to
`docker-compose.yml` or as shell env vars):

| Var | Default | Purpose |
|---|---|---|
| `COWORK_WORKSPACE` | `.` | Host directory mounted as the agent's workspace |
| `COWORK_PORT` | `5175` | Host port the UI/API is published on |
| `DEEPSEEK_API_KEY` | *(none)* | Seed the key without using Settings |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | |
| `DEEPSEEK_MODEL` | `deepseek-chat` | |

Without Docker Compose:

```bash
docker build -t cowork .
docker run -p 5175:5175 -v "$(pwd):/workspace" cowork
```

## 2. Compiled local distribution (no Docker, no `npm install`)

```bash
./build.sh --tar
```

This produces `dist/` (and `cowork-dist.tar.gz`) containing:
- `cowork.cjs` -- the entire backend, bundled into a single file with esbuild
- `public/` -- the built UI
- `.env.example`, `README.md`

Copy that folder anywhere with a Node 18+ runtime and run:

```bash
cd /path/to/your/project
node /path/to/dist/cowork.cjs serve
```

No `node_modules`, no build step, no network access needed at run time.

## 3. Local development (hot reload, two terminals)

```bash
# terminal 1 -- backend
cd server && npm install
cd /path/to/your/project && node /path/to/server/bin/cowork.js serve

# terminal 2 -- frontend, dev server with hot reload
cd web && npm install && npm run dev   # http://localhost:5173, proxies /api to :5175
```

## Configuring the LLM

The API key, base URL, model, temperature, and agent step/concurrency limits
are all editable from the **Settings** tab in the UI -- no restart needed,
and no need to hand-edit files. Settings are persisted to
`<workspace>/.agent/.env`, so they survive container restarts as long as
`/workspace` is a mounted volume (which it is, by default, in both the Docker
and Compose setups).

You can also seed `.agent/.env` directly (see `server/.agent/.env.example`),
or pass `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` as
container env vars -- either way ends up editable from Settings afterwards.

## Project layout

```
cowork-app/
  Dockerfile              multi-stage: builds web/, bundles into server image
  docker-compose.yml
  build.sh                 esbuild-based single-file local distribution builder
  server/                  backend (Express API, Orchestrator/Planner/Swarm/Report agents)
  web/                     frontend (React + TypeScript)
```

See `server/README.md` and `web/README.md` for details on each half.
