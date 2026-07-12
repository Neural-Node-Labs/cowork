'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEFAULT_IGNORE = new Set(['node_modules', '.git', '.agent', 'dist', 'build']);

function safeResolve(workspace, relPath) {
  const resolved = path.resolve(workspace, relPath || '.');
  if (!resolved.startsWith(path.resolve(workspace))) {
    throw new Error(`Path escapes workspace: ${relPath}`);
  }
  return resolved;
}

function isWorkspaceRoot(workspace, full) {
  return path.resolve(full) === path.resolve(workspace);
}

function walk(dir, onFile, base) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (DEFAULT_IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, onFile, base);
    } else {
      onFile(full);
    }
  }
}

function globToRegex(pattern) {
  // Escape regex-special chars first (safe: pattern has no literal * or ? that
  // need escaping, those are glob wildcards handled separately below).
  let s = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  // Tokenize glob wildcards into placeholders BEFORE introducing any regex
  // metacharacters of our own, so a later blanket replace can't corrupt them.
  // "**/" = zero or more path segments (must be optional, so "**/*.txt" still
  // matches root-level files); "**" = any chars incl. "/"; "*" = any chars
  // except "/"; "?" = single char.
  s = s
    .replace(/\*\*\//g, '\u0000DSS\u0000')
    .replace(/\*\*/g, '\u0000DS\u0000')
    .replace(/\*/g, '\u0000S\u0000')
    .replace(/\?/g, '\u0000Q\u0000');

  s = s
    .replace(/\u0000DSS\u0000/g, '(?:.*/)?')
    .replace(/\u0000DS\u0000/g, '.*')
    .replace(/\u0000S\u0000/g, '[^/]*')
    .replace(/\u0000Q\u0000/g, '.');

  return new RegExp(`^${s}$`);
}

/**
 * Tool registry. Each tool: { name, description, schema (JSON Schema for
 * DeepSeek's native function-calling "parameters"), run(args, ctx) }.
 * `ctx` = { workspace, skillManager, logger }.
 */
function buildTools() {
  const tools = {};

  tools.read_tool = {
    name: 'read_tool',
    description: 'Read a file, optionally a specific line range. Use this before editing anything.',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to the workspace root.' },
        start: { type: 'integer', description: 'Optional: first line to read (1-indexed).' },
        end: { type: 'integer', description: 'Optional: last line to read (inclusive).' }
      },
      required: ['path']
    },
    run(args, ctx) {
      const full = safeResolve(ctx.workspace, args.path);
      if (!fs.existsSync(full)) return `ERROR: file not found: ${args.path}`;
      const content = fs.readFileSync(full, 'utf8');
      if (args.start || args.end) {
        const lines = content.split(/\r?\n/);
        const start = Math.max(0, (args.start || 1) - 1);
        const end = args.end ? Math.min(lines.length, args.end) : lines.length;
        return lines.slice(start, end).join('\n');
      }
      return content.length > 20000 ? content.slice(0, 20000) + '\n...[truncated]' : content;
    }
  };

  tools.glob_tool = {
    name: 'glob_tool',
    description: 'Find files by glob pattern relative to the workspace root. Supports *, **, ?.',
    schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern, e.g. "**/*.js" or "src/*.ts".' }
      },
      required: ['pattern']
    },
    run(args, ctx) {
      const regex = globToRegex(args.pattern);
      const results = [];
      walk(ctx.workspace, (full) => {
        const rel = path.relative(ctx.workspace, full);
        if (regex.test(rel)) results.push(rel);
      });
      return results.length ? results.join('\n') : '(no matches)';
    }
  };

  tools.grep_tool = {
    name: 'grep_tool',
    description: 'Search file contents by regex, optionally scoped to files matching a glob.',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Regex pattern to search for (case-insensitive).' },
        glob: { type: 'string', description: 'Optional glob to restrict which files are searched.' }
      },
      required: ['query']
    },
    run(args, ctx) {
      const contentRegex = new RegExp(args.query, 'i');
      const fileRegex = args.glob ? globToRegex(args.glob) : null;
      const results = [];
      walk(ctx.workspace, (full) => {
        const rel = path.relative(ctx.workspace, full);
        if (fileRegex && !fileRegex.test(rel)) return;
        let content;
        try {
          content = fs.readFileSync(full, 'utf8');
        } catch {
          return;
        }
        const lines = content.split(/\r?\n/);
        lines.forEach((line, i) => {
          if (contentRegex.test(line)) {
            results.push(`${rel}:${i + 1}: ${line.trim()}`);
          }
        });
      });
      return results.length ? results.slice(0, 200).join('\n') : '(no matches)';
    }
  };

  tools.write_edit = {
    name: 'write_edit',
    description:
      'Create/overwrite a file (pass "content"), or make an exact find-and-replace edit to an ' +
      'existing file (pass "old" and "new" -- "old" must match exactly once).',
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to the workspace root.' },
        content: { type: 'string', description: 'Full new file content (creates or overwrites).' },
        old: { type: 'string', description: 'Exact existing text to replace (must occur exactly once).' },
        new: { type: 'string', description: 'Replacement text for "old".' }
      },
      required: ['path']
    },
    run(args, ctx) {
      const full = safeResolve(ctx.workspace, args.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });

      if (typeof args.content === 'string') {
        fs.writeFileSync(full, args.content, 'utf8');
        return `OK: wrote ${args.content.length} bytes to ${args.path}`;
      }

      if (typeof args.old === 'string' && typeof args.new === 'string') {
        if (!fs.existsSync(full)) return `ERROR: file not found: ${args.path}`;
        const current = fs.readFileSync(full, 'utf8');
        const occurrences = current.split(args.old).length - 1;
        if (occurrences !== 1) {
          return `ERROR: expected exactly 1 occurrence of "old" text, found ${occurrences}`;
        }
        const updated = current.replace(args.old, args.new);
        fs.writeFileSync(full, updated, 'utf8');
        return `OK: edited ${args.path}`;
      }

      return 'ERROR: write_edit requires either "content" or both "old" and "new"';
    }
  };

  tools.file_ops = {
    name: 'file_ops',
    description:
      'Structured file/directory management: move, copy, delete, mkdir, or list. Prefer this over ' +
      'run_command for these operations -- it stays inside the workspace and gives clear errors.',
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['move', 'copy', 'delete', 'mkdir', 'list'] },
        path: { type: 'string', description: 'Target path relative to the workspace root.' },
        destination: {
          type: 'string',
          description: 'Destination path relative to workspace root (required for move/copy).'
        }
      },
      required: ['action', 'path']
    },
    run(args, ctx) {
      const full = safeResolve(ctx.workspace, args.path);

      if (isWorkspaceRoot(ctx.workspace, full) && (args.action === 'delete' || args.action === 'move')) {
        return 'ERROR: refusing to delete or move the workspace root itself';
      }

      switch (args.action) {
        case 'list': {
          if (!fs.existsSync(full)) return `ERROR: path not found: ${args.path}`;
          const entries = fs.readdirSync(full, { withFileTypes: true });
          return entries.length
            ? entries.map((e) => `${e.isDirectory() ? 'd' : 'f'} ${e.name}`).join('\n')
            : '(empty directory)';
        }
        case 'mkdir': {
          fs.mkdirSync(full, { recursive: true });
          return `OK: created directory ${args.path}`;
        }
        case 'delete': {
          if (!fs.existsSync(full)) return `ERROR: path not found: ${args.path}`;
          fs.rmSync(full, { recursive: true, force: true });
          return `OK: deleted ${args.path}`;
        }
        case 'move':
        case 'copy': {
          if (!args.destination) return `ERROR: "destination" is required for ${args.action}`;
          const dest = safeResolve(ctx.workspace, args.destination);
          if (!fs.existsSync(full)) return `ERROR: path not found: ${args.path}`;
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          if (args.action === 'move') {
            fs.renameSync(full, dest);
            return `OK: moved ${args.path} -> ${args.destination}`;
          }
          fs.cpSync(full, dest, { recursive: true });
          return `OK: copied ${args.path} -> ${args.destination}`;
        }
        default:
          return `ERROR: unknown action "${args.action}". Use move, copy, delete, mkdir, or list.`;
      }
    }
  };

  tools.run_command = {
    name: 'run_command',
    description:
      'Run a shell command in the workspace (e.g. to run a program, a test suite, or a build). ' +
      'Returns stdout+stderr and the exit code, truncated to 8000 chars.',
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute, e.g. "npm test".' }
      },
      required: ['command']
    },
    run(args, ctx) {
      try {
        const out = execSync(args.command, {
          cwd: ctx.workspace,
          encoding: 'utf8',
          timeout: 120000,
          maxBuffer: 5 * 1024 * 1024,
          stdio: ['ignore', 'pipe', 'pipe']
        });
        const trimmed = out.length > 8000 ? out.slice(0, 8000) + '\n...[truncated]' : out;
        return `EXIT 0\n${trimmed}`;
      } catch (err) {
        const out = (err.stdout || '') + (err.stderr || '');
        const trimmed = out.length > 8000 ? out.slice(0, 8000) + '\n...[truncated]' : out;
        return `EXIT ${err.status ?? 1}\n${trimmed || err.message}`;
      }
    }
  };

  tools.create_skill = {
    name: 'create_skill',
    description:
      'Create (or overwrite) a hot-pluggable skill file in .agent/skill/, immediately available to ' +
      'load via load_skill. Use this to save a reusable process/strategy you discover while working, ' +
      'so future tasks benefit from it too. Check the existing skill list first to avoid duplicates.',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Unique kebab-case skill id, e.g. "safe-database-migration". Used as the filename.'
        },
        description: { type: 'string', description: 'One sentence summary, always visible to every agent.' },
        triggers: { type: 'string', description: 'Comma-separated keywords/phrases that suggest this skill applies.' },
        type: {
          type: 'string',
          enum: ['process', 'strategy', 'instruction', 'planning', 'experience'],
          description: 'Category of skill.'
        },
        body: {
          type: 'string',
          description:
            'Full markdown instructions: when to use it, concrete steps, gotchas, examples. ' +
            'Only loaded into context on demand via load_skill.'
        }
      },
      required: ['name', 'description', 'body']
    },
    run(args, ctx) {
      if (!ctx.skillManager) return 'ERROR: skill manager is not available in this context';
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(args.name)) {
        return 'ERROR: name must be kebab-case (lowercase letters, digits, hyphens), e.g. "my-new-skill"';
      }
      const skillPath = path.join(ctx.workspace, '.agent', 'skill', `${args.name}.md`);
      const header = [
        '---',
        `name: ${args.name}`,
        `description: ${args.description}`,
        `triggers: ${args.triggers || ''}`,
        `type: ${args.type || 'strategy'}`,
        '---',
        ''
      ].join('\n');
      fs.mkdirSync(path.dirname(skillPath), { recursive: true });
      fs.writeFileSync(skillPath, `${header}\n${args.body.trim()}\n`, 'utf8');
      ctx.skillManager.reload();
      return `OK: created skill "${args.name}" at .agent/skill/${args.name}.md and reloaded the skill registry`;
    }
  };

  return tools;
}

module.exports = { buildTools, safeResolve };
