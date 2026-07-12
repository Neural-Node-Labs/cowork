'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Skill file format (Markdown with YAML-ish frontmatter):
 *
 * ---
 * name: refactor-large-file
 * description: Strategy for safely refactoring a large file into modules.
 * triggers: refactor, split file, large file
 * type: strategy   # one of: process | strategy | instruction | planning | experience
 * ---
 * <body: full instructions the LLM should follow when this skill is loaded>
 *
 * Only the header (name/description/triggers/type) is loaded into every
 * agent's system prompt by default -- cheap, always-visible awareness.
 * The full body is only injected on demand, when the LLM's ReAct loop
 * issues: Action: load_skill[{"name": "refactor-large-file"}]
 */
function parseSkillFile(raw, filename) {
  const match = raw.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]?([\s\S]*)$/);
  if (!match) {
    return {
      name: path.basename(filename, path.extname(filename)),
      description: '(no description header found)',
      triggers: [],
      type: 'instruction',
      body: raw
    };
  }
  const [, header, body] = match;
  const meta = {};
  for (const line of header.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    meta[key] = val;
  }
  return {
    name: meta.name || path.basename(filename, path.extname(filename)),
    description: meta.description || '',
    triggers: (meta.triggers || '').split(',').map((s) => s.trim()).filter(Boolean),
    type: meta.type || 'instruction',
    body: body.trim()
  };
}

class SkillManager {
  constructor(workspace, logger) {
    this.skillDir = path.join(workspace, '.agent', 'skill');
    this.logger = logger;
    this.skills = new Map();
    this.reload();
  }

  reload() {
    this.skills.clear();
    fs.mkdirSync(this.skillDir, { recursive: true });
    const files = fs
      .readdirSync(this.skillDir)
      .filter((f) => f.endsWith('.md'));
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(this.skillDir, file), 'utf8');
        const skill = parseSkillFile(raw, file);
        this.skills.set(skill.name, skill);
      } catch (err) {
        this.logger?.error(`Failed to load skill ${file}: ${err.message}`);
      }
    }
    return this.list();
  }

  list() {
    return [...this.skills.values()].map(({ name, description, triggers, type }) => ({
      name,
      description,
      triggers,
      type
    }));
  }

  // Compact manifest injected into every agent system prompt.
  manifestText() {
    const list = this.list();
    if (!list.length) return '(no skills registered)';
    return list
      .map(
        (s) =>
          `- ${s.name} [${s.type}]: ${s.description}${
            s.triggers.length ? ` (triggers: ${s.triggers.join(', ')})` : ''
          }`
      )
      .join('\n');
  }

  load(name) {
    const skill = this.skills.get(name);
    if (!skill) return null;
    return skill.body;
  }
}

module.exports = { SkillManager, parseSkillFile };
