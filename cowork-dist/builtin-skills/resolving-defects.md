---
name: resolving-defects
description: Structured approach to finding the root cause of a bug and fixing it, rather than patching symptoms.
triggers: fix bug, defect, issue, error, broken, failing test, not working, regression, crash, stack trace
type: strategy
---

## When to use
The sub-task describes something that's currently broken -- a failing test,
an error message, a crash, or behavior that doesn't match what's expected.
Pair with coding-and-testing for the actual write/run/verify loop; this skill
is specifically about finding the right thing to fix.

## Steps
1. **Reproduce first.** Before touching any code, use `run_command` to
   trigger the failure yourself (run the failing test, the crashing command,
   or the reported scenario) and capture the exact error/output. If you can't
   reproduce it, say so explicitly rather than guessing at a fix.
2. **Read the error precisely.** Note the exact exception type/message, the
   file and line it points to, and the full stack trace if there is one --
   these usually narrow the search dramatically. Don't skim past this to
   start editing code.
3. **Localize with evidence, not assumption.** Use `grep_tool` to find where
   the failing symbol/function/message is defined and every place it's
   called from, and `read_tool` to examine that code directly. Form a
   specific hypothesis ("X is called with a null Y when Z happens") before
   changing anything.
4. **Check recent context.** If the codebase suggests version control is in
   use, `run_command` something like `git log -p -- <file>` or `git blame`
   on the suspect region can reveal whether a recent change introduced the
   issue -- much faster than reasoning from scratch.
5. **Make the minimal fix** for the root cause you identified, not a broad
   rewrite and not just a guard clause that hides the symptom (e.g. don't
   wrap a bug in a try/catch that swallows the error unless that's genuinely
   the correct behavior).
6. **Re-run the original reproduction** from step 1 and confirm it now
   passes/behaves correctly.
7. **Check for regressions.** Run the broader test suite (or at least the
   tests for the module you touched) to make sure the fix didn't break
   something else.
8. **Explain the root cause in your summary**, not just "fixed it" -- this is
   what makes the fix trustworthy and helps whoever reads the report later.

## Gotchas
- A fix that only makes the reported symptom go away (rather than addressing
  why it happened) often resurfaces elsewhere -- if you're not sure you found
  the real cause, say so rather than reporting `"done"` with false confidence.
- Don't change unrelated code "while you're in there" -- it makes the fix
  harder to verify and review, and increases regression risk.
- If reproducing the issue requires specific data/environment state you
  don't have, note that limitation clearly rather than fabricating a
  validation result.
