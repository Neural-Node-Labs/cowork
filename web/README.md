# cowork-ui

React + TypeScript console for the `cowork` agent CLI: chat with the
orchestrator, watch the Planner/Swarm ReAct trail live, inspect raw logs,
track token spend, read the generated report, and switch between 10 themes.

## Setup

This talks to the `cowork` backend over HTTP, so start that first, from the
workspace you want the agent to operate on:

```bash
cd /path/to/your/project
cowork serve            # defaults to http://localhost:5175
```

Then, in this folder:

```bash
npm install
npm run dev              # http://localhost:5173, proxies /api/* to :5175
```

By default this talks to the backend via same-origin relative requests
(`/api/...`) -- in dev that's handled by the Vite proxy in `vite.config.ts`;
in a combined production build (see `../Dockerfile` / `../build.sh`) the
backend serves this UI itself, so it's naturally same-origin. If you need to
point at a different backend, set `VITE_API_BASE`:

```
VITE_API_BASE=http://localhost:5175
```

### Production build

```bash
npm run build     # outputs to dist/
npm run preview    # serve the production build locally
```

## Views

| View | What it shows |
|---|---|
| **Chat** | Conversation with the orchestrator. When a message turns into a task, a pipeline trail (task detected → planning → swarm → report) appears under the reply, with quick links to jump to Reasoning/Report. |
| **Logs** | Tabs for `sys.log` / `react.log` / `llm.log`, tailed and auto-refreshed every 3s. |
| **Reasoning** | The live Thought/Action/Observation/Final transcript from Planner & Swarm agents, color-coded by step kind, with a plan progress strip and agent filter. |
| **Tokens** | Accumulated prompt/completion/total tokens, a cumulative-usage sparkline, and a per-agent breakdown table. |
| **Report** | Renders `.agent/report.md` (with a raw-markdown toggle). |
| **Settings** | DeepSeek API key (masked once set), base URL, model, temperature, max tokens, and (under "Advanced") planner/swarm step limits and concurrency. Saved immediately, no restart needed. |
| **Theme** | 10 selectable themes (Terminal, Paper, Nord, Dracula, Solarized Dark/Light, Monokai, Midnight Ocean, Sunset Glow, High Contrast), picked from the sidebar footer and persisted in `localStorage`. |

## Notes

- All data-fetching views poll on an interval (2-5s) rather than using a
  websocket/SSE connection -- simpler and robust for a local dev tool. Chat is
  plain request/response since the backend runs the full pipeline
  synchronously before responding.
- The Report view uses `marked` to render markdown; since report content is
  generated entirely by the trusted local `cowork` backend (not arbitrary
  user/web content), no additional sanitization pass is applied.
- Adding an 11th theme is a one-line addition to `src/themes/themes.ts` -- no
  other code changes needed.
