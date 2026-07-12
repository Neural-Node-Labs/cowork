---
name: coding-and-testing
description: Write or change code, then actually run it (or its tests) to verify it works before reporting done.
triggers: implement, add a feature, write code, write a function, run tests, run the program, build, compile
type: process
---

## When to use
Any sub-task that involves writing new code or changing existing code. This
is the default workflow for coding sub-tasks -- pair it with
resolving-defects when the task is specifically about fixing a known bug.

## Steps
1. **Understand before writing.** Use `read_tool` on the relevant files and
   `grep_tool` for how similar things are already done in this codebase (naming
   conventions, existing helpers, test patterns). Don't guess at conventions
   you can just look up.
2. **Check for an existing way to run things.** `read_tool` on `package.json`
   / `Makefile` / `pyproject.toml` / etc. (whichever applies) to find the
   real test/build/run commands -- don't assume `npm test` or `pytest` are
   right without confirming.
3. **Make the change** with `write_edit` -- prefer small, targeted edits
   (`old`/`new`) over full-file rewrites when you're changing existing code,
   so you don't accidentally clobber unrelated parts of the file.
4. **Run it.** Use `run_command` to actually execute the program, script, or
   test suite the change is meant to affect. Never report success based on
   reading the code and reasoning it "should" work -- run it.
5. **Read the actual output.** Check both the exit code and the printed
   output for errors, failed assertions, stack traces, or warnings -- not
   just "did the process exit 0".
6. **Iterate.** If it fails, treat that as new information: re-read the
   relevant code/output (see resolving-defects for a structured way to do
   this), make another targeted fix, and re-run. Don't keep re-running the
   same failing command hoping for a different result.
7. **Only report `"done"` once you've verified the specific validation
   criteria you were given** -- e.g. actually running the test that was
   supposed to pass, or reading back the file that was supposed to change,
   not just "the edit tool returned OK".

## Gotchas
- A command exiting 0 doesn't always mean success (e.g. a test runner that
  reports failures but still exits 0 in some configs) -- read the output.
- If a test suite is slow or has unrelated pre-existing failures, don't try
  to fix everything -- confirm your specific change didn't introduce new
  failures, and note pre-existing ones in your summary rather than silently
  ignoring or trying to fix out-of-scope issues.
- `run_command` has a 120s timeout -- if a build/test genuinely needs longer,
  say so in your summary rather than reporting a false failure.
