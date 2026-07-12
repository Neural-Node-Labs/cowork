---
name: safe-refactor
description: Safely refactor or restructure existing code without breaking behavior.
triggers: refactor, restructure, split file, clean up code, reorganize
type: strategy
---

## When to use
Use this whenever a sub-task asks to refactor, split, or reorganize existing
code, rather than write something brand new.

## Steps
1. Use `read_tool` to read the target file(s) fully before changing anything.
2. Use `grep_tool` to find every place the code/symbol you're changing is
   referenced elsewhere in the workspace, so you don't break callers.
3. Make the smallest change that satisfies the sub-task's validation
   criteria — prefer several small `write_edit` calls over one giant rewrite.
4. After editing, run the project's existing test/build command (if any)
   via `run_command` to confirm nothing broke.
5. If no test suite exists, at minimum re-read the changed file to sanity
   check syntax before marking the sub-task done.

## Gotchas
- Don't assume file encoding/line endings; read before you write.
- If a rename affects multiple files, batch all the edits before validating,
  otherwise intermediate states may not compile/run.
