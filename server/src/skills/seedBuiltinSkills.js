'use strict';
const fs = require('fs');
const path = require('path');

/**
 * The 5 skills that ship with cowork live in a `builtin-skills/` folder
 * bundled alongside the tool itself (NOT inside any particular user
 * workspace, since `workspace` is whatever directory `cowork` is run from).
 * Resolution supports both layouts:
 *  - source tree: bin/cowork.js -> ../builtin-skills
 *  - bundled single-file distribution: cowork.cjs -> ./builtin-skills (sibling)
 */
function resolveBuiltinSkillsDir(fromDir) {
  const candidates = [
    path.join(fromDir, '..', 'builtin-skills'),
    path.join(fromDir, 'builtin-skills')
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/**
 * Copies any builtin skill file into <workspace>/.agent/skill/ that isn't
 * already present there. Never overwrites a file the user already has
 * (whether that's an untouched copy or one they've customized/replaced).
 */
function seedBuiltinSkills(workspace, fromDir, logger) {
  const builtinDir = resolveBuiltinSkillsDir(fromDir);
  if (!builtinDir) return { seeded: [], builtinDir: null };

  const targetDir = path.join(workspace, '.agent', 'skill');
  fs.mkdirSync(targetDir, { recursive: true });

  const seeded = [];
  for (const file of fs.readdirSync(builtinDir)) {
    const targetPath = path.join(targetDir, file);
    if (fs.existsSync(targetPath)) continue;
    fs.copyFileSync(path.join(builtinDir, file), targetPath);
    seeded.push(file);
  }

  if (seeded.length) {
    logger?.info(`Seeded ${seeded.length} builtin skill(s) into ${targetDir}: ${seeded.join(', ')}`);
  }

  return { seeded, builtinDir };
}

module.exports = { seedBuiltinSkills, resolveBuiltinSkillsDir };
