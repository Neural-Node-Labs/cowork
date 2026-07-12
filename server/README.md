# cowork

A local, multi-agent worker CLI that runs on DeepSeek. Chat with it from any
project directory; it decides whether you're just chatting or handing it a
task, and if it's a task, it plans it, executes it with a swarm of ReAct
workers, and reports back.

## Setup

```bash
# from wherever you keep the tool
npm install
npm link          # makes the `cowork` command available globally
```

The DeepSeek API key and other LLM config can be set up two ways:

- **From the UI** (recommended) -- run `cowork serve`, open the app, go to
  **Settings**, and enter your key. No restart needed, and it's saved to
  `.agent/.env` for you.
- **By hand**, before first run:
  ```bash
  mkdir -p .agent
  cp /path/to/server/.agent/.env.example .agent/.env
  # edit .agent/.env and set DEEPSEEK_API_KEY
  ```

Either way, `cowork chat` / `cowork serve` will start fine even with no key
configured yet -- they'll just tell you it's missing when you try to use it.

## Usage

```bash
cd /path/to/your/project
cowork chat
```

Or a one-off message:

```bash
cowork chat "add a .gitignore for a node project"
```

The workspace is always the directory you run `cowork` from.

### Frontend + combined deployment

This backend lives inside `cowork-app/` alongside `../web` (the React+TS
console) and top-level `Dockerfile` / `docker-compose.yml` / `build.sh`.
See the top-level `cowork-app/README.md` for the three ways to run the
combined package (Docker, compiled single-file local distribution, or plain
dev mode with hot reload). The short version, for plain dev mode:

```bash
cowork serve              # starts the API (+ built UI, if present) on :5175
# in another terminal:
cd ../web && npm install && npm run dev   # hot-reloading UI on :5173
```

## How it works

```
You → Orchestrator Agent
        │
        ├─ no task needed → replies directly
        │
        └─ task detected
              │
              ▼
        Planner Agent (ReAct: read_tool/glob_tool/grep_tool)
              │  writes .agent/plan.json
              ▼
        Orchestrator reads plan, groups sub-tasks into
        dependency "waves" (depend-on respected)
              │
              ▼
        Swarm Agents (ReAct: read/write/run_command/glob/grep,
        one worker per sub-task, run in parallel within a wave,
        bounded by SWARM_CONCURRENCY)
              │  update status in .agent/plan.json as they go
              ▼
        Report Agent → .agent/report.md
```

### `.agent/plan.json` shape

```json
{
  "task": "overall task description",
  "target-workspace": "/abs/path",
  "sub-tasks": [
    {
      "task-id": "1",
      "task": "what this accomplishes",
      "command": "concrete instruction/command",
      "validation": "how to verify success",
      "priority": 1,
      "status": "pending | in-progress | done | failed | blocked",
      "depend-on": ["other-task-ids"]
    }
  ]
}
```

If a sub-task's dependency fails, dependents are marked `blocked` and skipped
rather than run against a broken precondition.

### Logs (`.agent/logs/`)

- **react.log** — every Thought / Action / Observation from Planner & Swarm agents
- **llm.log** — raw LLM requests and responses
- **sys.log** — errors and general info messages
- **tokens.json** — accumulated token usage (prompt/completion/total, per agent, and a running-total history), used by the `cowork-ui` Tokens view

### Built-in tools

Exposed to the model via DeepSeek's native function calling (not a parsed
text protocol -- see "How agents call tools" below):

| Tool | Purpose |
|---|---|
| `read_tool` | Read a file (optionally a line range) |
| `glob_tool` | Find files by glob pattern (`**`, `*`, `?` supported) |
| `grep_tool` | Regex search across file contents |
| `write_edit` | Create/overwrite a file, or do an exact find/replace edit |
| `file_ops` | Structured move / copy / delete / mkdir / list, confined to the workspace |
| `run_command` | Run a shell command in the workspace (build, test, run a program) |
| `create_skill` | Write a new hot-pluggable skill to `.agent/skill/` and reload the registry immediately |
| `load_skill` | Load the full body of a registered skill |

The Planner only gets the read-only tools (`read_tool`/`glob_tool`/`grep_tool`)
— it explores but never modifies the workspace. Swarm workers get the full set.

### How agents call tools

Planner and Swarm run on DeepSeek's native `tools`/`tool_calls` function-calling
API (the same contract OpenAI's API uses) rather than a text protocol the
model has to be told to imitate. This is materially more reliable: no
regex-parsing a "Thought:/Action:" format out of free-form text, no malformed
JSON-in-a-string edge cases. `react.log` and the UI's Reasoning view are
unaffected by this -- every tool call/result is still logged as
Thought/Action/Observation/Final, just derived from the structured
`tool_calls` response instead of parsed text.

## Skills (hot-pluggable)

Five skills ship with cowork (`server/builtin-skills/`) and are copied into
any new workspace's `.agent/skill/` the first time you run `cowork` there
(existing/customized files are never overwritten):

| Skill | Covers |
|---|---|
| `creating-new-skills` | How to turn a process you just used into a new skill via the `create_skill` tool |
| `managing-files` | Safe move/copy/delete/organize, preferring `file_ops` over raw shell commands |
| `coding-and-testing` | Write/change code, then actually run it (or its tests) before reporting done |
| `resolving-defects` | Reproduce → localize with evidence → minimal fix → re-verify → check regressions |
| `safe-refactor` | Restructuring existing code without changing behavior |

Drop your own Markdown file into `.agent/skill/` (or have an agent call
`create_skill`) and it's picked up automatically — no restart, no
registration step. See `.agent/skill/_TEMPLATE.md.txt` for the format:

```
---
name: my-skill-name
description: One-sentence summary (always visible to the LLM).
triggers: keyword one, keyword two
type: strategy   # process | strategy | instruction | planning | experience
---

Full instructions the LLM only sees once it explicitly loads this skill.
```

Every agent's system prompt always includes the compact header
(name/description/triggers/type) for every registered skill. The full body
is only pulled into context on demand, by calling the `load_skill` tool with
`{"name": "my-skill-name"}` -- keeping the always-on prompt cheap while
letting the model pull in detailed, hard-won process knowledge exactly when
it's relevant. An agent can also author a brand-new skill mid-task via the
`create_skill` tool (see the `creating-new-skills` skill for how it decides
when that's worth doing).

## Configuration (`.agent/.env`)

DeepSeek is the only supported provider, and the default model
(`deepseek-chat`) is what's used unless you change it -- this is fixed by
design, not just a default that happens to be unset. All of the below are
editable live from the **Settings** tab in the UI (backed by
`GET`/`POST /api/settings`), or by hand in `.agent/.env`:

| Key | Default | Purpose |
|---|---|---|
| `DEEPSEEK_API_KEY` | *(none)* | Your DeepSeek API key -- required before chat/tasks will work |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | API base URL |
| `DEEPSEEK_MODEL` | `deepseek-chat` | Model name |
| `DEEPSEEK_TEMPERATURE` | `0.3` | Sampling temperature |
| `DEEPSEEK_MAX_TOKENS` | `4096` | Max output tokens per call |
| `PLANNER_MAX_STEPS` | `12` | Max ReAct steps before planner gives up |
| `SWARM_MAX_STEPS` | `15` | Max ReAct steps per sub-task before it fails |
| `SWARM_CONCURRENCY` | `4` | Max sub-tasks run in parallel per wave |

`cowork serve` also reads `PORT` / `COWORK_PORT` (listen port) and
`COWORK_PUBLIC_DIR` (path to a built frontend to serve alongside the API --
auto-detected in both the source-tree layout and the bundled single-file
distribution produced by `build.sh`).

## Project layout

```
bin/cowork.js                     CLI entry point (chat / serve)
builtin-skills/                    the 5 skills seeded into new workspaces
src/config.js                      .agent/.env loader + writer (for Settings)
src/logging/logger.js              react.log / llm.log / sys.log writer
src/logging/tokenTracker.js         accumulated token usage -> tokens.json
src/logging/reactLogParser.js       parses react.log into structured entries
src/llm/deepseekClient.js          DeepSeek client: chat + native tool-calling, hot-reconfigurable
src/tools/index.js                 read/glob/grep/write_edit/file_ops/run_command/create_skill tools
src/skills/skillManager.js         hot-plugin skill loader
src/skills/seedBuiltinSkills.js     copies builtin-skills/ into a new workspace
src/agents/reactEngine.js          function-calling agent loop (still logs Thought/Action/Observation)
src/agents/planner.js              Planner agent → .agent/plan.json
src/agents/swarm.js                Swarm agents, dependency-wave execution
src/agents/report.js               Report agent → .agent/report.md
src/agents/orchestrator.js         Chat classification + pipeline driver
src/server/index.js                Express API (+ serves the built frontend)
```

## Notes / known limitations

- `run_command` has a 120s timeout and 5MB output cap per call.
- Swarm "parallelism" is concurrent async workers in one Node process, not
  separate OS processes/sandboxes — fine for file edits and CLI commands, but
  don't rely on OS-level isolation between sub-tasks.
- `file_ops` refuses to delete/move the workspace root and blocks paths that
  resolve outside the workspace, but there's no undo for a delete inside it —
  see the `managing-files` skill for the "prefer move over delete when in
  doubt" guidance the agents are given.
- Function calling is a DeepSeek/`deepseek-chat` feature; if you point
  `DEEPSEEK_MODEL` at a model that doesn't support `tools`, Planner/Swarm
  calls will fail at the API level rather than silently falling back to a
  text protocol.
