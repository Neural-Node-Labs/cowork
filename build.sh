#!/usr/bin/env bash
# Builds a self-contained local distribution of cowork:
#   dist/cowork.cjs      - the entire backend (Express API + agents), one file
#   dist/public/          - the built React UI, served by that same file
#   dist/.agent/.env.example
#   dist/README.md
#
# Result needs only a Node.js runtime -- no `npm install` anywhere.
#
# Usage:
#   ./build.sh              # writes to ./dist
#   ./build.sh --tar         # also produces cowork-dist.tar.gz

set -euo pipefail
cd "$(dirname "$0")"

echo "==> Building frontend (web/)"
(cd web && npm install --no-audit --no-fund && npm run build)

echo "==> Installing backend deps (server/, incl. esbuild for bundling)"
(cd server && npm install --no-audit --no-fund)

echo "==> Bundling backend into a single file with esbuild"
rm -rf dist
mkdir -p dist
(cd server && npx esbuild bin/cowork.js \
  --bundle \
  --platform=node \
  --target=node18 \
  --outfile=../dist/cowork.cjs \
  --log-level=warning)
chmod +x dist/cowork.cjs

echo "==> Copying built UI next to the bundle (dist/public)"
cp -r web/dist dist/public

echo "==> Copying builtin skills next to the bundle (dist/builtin-skills)"
cp -r server/builtin-skills dist/builtin-skills

echo "==> Copying config example + docs"
cp server/.agent/.env.example dist/.env.example
cat > dist/README.md << 'EOF'
# cowork -- local distribution

Everything needed to run cowork is in this folder. No `npm install` required
-- just a Node.js 18+ runtime.

## Run

```bash
cd /path/to/your/project      # the workspace cowork will operate on
node /path/to/this/dist/cowork.cjs serve
```

Then open http://localhost:5175 (change with `--port N` or `PORT=`).

## Configure the LLM

Either:
- Open the app, go to **Settings**, and enter your DeepSeek API key (and
  optionally base URL / model / temperature) -- saved to
  `<your-project>/.agent/.env` automatically, applied immediately.
- Or copy `.env.example` from this folder to `<your-project>/.agent/.env`
  and fill it in before starting the server.

## Files

- `cowork.cjs` -- the entire backend (API + Planner/Swarm/Report agents),
  bundled into one file.
- `public/` -- the built UI, served by `cowork.cjs` at the same port.
- `builtin-skills/` -- default skills, auto-copied into any new workspace's
  `.agent/skill/` the first time cowork runs there.
- `.env.example` -- template for `.agent/.env`.
EOF

echo "==> Done. Distribution is in ./dist"
du -sh dist

if [[ "${1:-}" == "--tar" ]]; then
  echo "==> Creating cowork-dist.tar.gz"
  tar -czf cowork-dist.tar.gz -C dist .
  du -sh cowork-dist.tar.gz
fi
