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
