---
name: managing-files
description: Safely inspect, move, copy, delete, and organize files/directories in the workspace.
triggers: move file, rename file, delete file, organize files, clean up directory, restructure folders, mkdir
type: strategy
---

## When to use
Any sub-task that's primarily about the filesystem shape rather than file
*contents* -- reorganizing directories, renaming/moving files, removing
generated/obsolete files, or setting up a new folder structure.

## Steps
1. **Look before you act.** Use `glob_tool` (and `read_tool` if contents
   matter) to confirm exactly what exists and matches your intended pattern
   BEFORE moving or deleting anything. A glob that's too broad is the most
   common way to damage things that weren't part of the task.
2. **Prefer `file_ops` over `run_command`** for move/copy/delete/mkdir/list --
   it's confined to the workspace and gives unambiguous errors, whereas shell
   commands like `rm -rf` or `mv` can silently do the wrong thing if a path
   or glob doesn't expand the way you expect.
3. **Prefer move over delete when in doubt.** If a sub-task's intent is
   ambiguous between "remove this" and "this shouldn't be here anymore", moving
   to something like `.trash/` (still inside the workspace) is safer than an
   irreversible delete, unless the task is explicit about deletion.
4. **Batch a full listing before bulk operations.** If you're about to move
   or delete more than one or two files, run `file_ops` with `action: "list"`
   (or `glob_tool`) first and sanity-check the full result set, not just the
   first few names.
5. **Verify after acting.** Re-run `glob_tool` / `file_ops` `list` to confirm
   the filesystem now matches what you intended -- don't just trust that the
   operation succeeded because it returned "OK".
6. For anything `file_ops` doesn't cover (e.g. archiving, permissions,
   symlinks), fall back to `run_command`, but keep the command as narrow and
   explicit as possible (avoid wildcards you haven't already verified with
   `glob_tool`).

## Gotchas
- `file_ops` refuses to delete or move the workspace root itself -- if you
  need to restructure the root, operate on its contents instead.
- Deleting is NOT recoverable. If a sub-task's validation criteria doesn't
  clearly call for permanent deletion, consider whether "move out of the way"
  would satisfy it just as well.
- Moving a file changes its relative import/require paths in most languages
  -- after a move, `grep_tool` for references to the old path and update them,
  then re-run any relevant tests (see the coding-and-testing skill).
