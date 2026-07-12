'use strict';
const fs = require('fs');

const HEADER_RE = /^\[(.+?)\] \[(.+?)\](?: \[task:(.+?)\])? (\w+):$/;

/**
 * react.log entries look like:
 *
 *   [2026-07-11T10:00:00.000Z] [planner] THOUGHT:
 *   I should look at the existing files first.
 *
 * (blank line separates entries). Parses the whole file into structured
 * records: { timestamp, agent, taskId, kind, content }
 */
function parseReactLog(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const blocks = raw.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);

  const entries = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const headerMatch = lines[0].match(HEADER_RE);
    if (!headerMatch) continue;
    const [, timestamp, agent, taskId, kind] = headerMatch;
    entries.push({
      timestamp,
      agent,
      taskId: taskId || null,
      kind: kind.toLowerCase(),
      content: lines.slice(1).join('\n').trim()
    });
  }
  return entries;
}

module.exports = { parseReactLog };
