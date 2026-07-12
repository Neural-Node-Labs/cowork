---
name: creating-new-skills
description: How to turn a reusable process you just used (or were told to use) into a new hot-pluggable skill.
triggers: create a skill, save this as a skill, new skill, remember this approach, add a skill for
type: process
---

## When to use
- You (or the task) were explicitly asked to "create a skill for X".
- You just worked through a non-obvious process and it's likely to recur
  (e.g. a specific migration pattern, a project-specific build quirk, a
  debugging trick) -- worth saving so future tasks don't rediscover it.

Before creating one, call `load_skill` is not needed for this -- instead
check the skill list already given to you in your system prompt. If an
existing skill covers the same ground, prefer improving it (recreate with
the same `name` to overwrite) over creating a near-duplicate.

## Steps
1. Pick a unique, kebab-case `name` that describes the *situation*, not the
   one-off task (e.g. `safe-database-migration`, not `fix-users-table`).
2. Write one clear sentence for `description` -- this is shown to every
   agent, every time, so keep it short and make it obvious when it applies.
3. Add a few comma-separated `triggers`: words or short phrases a task
   description would plausibly contain when this skill is relevant.
4. Pick a `type`:
   - `process` -- a repeatable sequence of steps (e.g. this skill).
   - `strategy` -- a way of approaching a class of problem.
   - `instruction` -- a specific rule/constraint to follow.
   - `planning` -- guidance for the Planner when breaking work down.
   - `experience` -- a lesson learned from a specific past failure.
5. Write the `body` like a runbook for a competent engineer who has never
   seen this before: when to use it, concrete steps, gotchas, and (if
   helpful) a short example. Keep it focused -- this is only loaded when
   explicitly requested, so it can be more detailed than the description,
   but it shouldn't be a full tutorial either.
6. Call `create_skill` with these fields. It writes the file to
   `.agent/skill/<name>.md` and reloads the registry immediately -- no
   restart needed, and it's available to load in the very same task if
   useful.

## Gotchas
- Don't create a skill for something you'll only ever do once in this one
  task -- that's just noise in every future agent's context.
- Keep `description` free of jargon specific to this one codebase unless
  the skill genuinely only applies there.
- If you're fixing/improving an existing skill, reuse its exact `name` so it
  overwrites rather than creating a confusing near-duplicate.
