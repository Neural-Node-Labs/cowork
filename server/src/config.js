'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Minimal .env parser (no external deps).
 * Supports KEY=VALUE, quoted values, comments (#) and blank lines.
 */
function parseEnv(content) {
  const out = {};
  const lines = content.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * Loads DeepSeek + agent configuration from <workspace>/.agent/.env
 * Falls back to process.env for any keys not found in the file.
 */
function loadConfig(workspace) {
  const agentDir = path.join(workspace, '.agent');
  const envPath = path.join(agentDir, '.env');

  let fileEnv = {};
  if (fs.existsSync(envPath)) {
    fileEnv = parseEnv(fs.readFileSync(envPath, 'utf8'));
  }

  const get = (key, fallback) => fileEnv[key] ?? process.env[key] ?? fallback;

  const config = {
    workspace,
    agentDir,
    envPath,
    envFound: fs.existsSync(envPath),
    deepseek: {
      apiKey: get('DEEPSEEK_API_KEY', ''),
      baseUrl: get('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
      model: get('DEEPSEEK_MODEL', 'deepseek-chat'),
      temperature: parseFloat(get('DEEPSEEK_TEMPERATURE', '0.3')),
      maxTokens: parseInt(get('DEEPSEEK_MAX_TOKENS', '4096'), 10)
    },
    limits: {
      plannerMaxSteps: parseInt(get('PLANNER_MAX_STEPS', '12'), 10),
      swarmMaxSteps: parseInt(get('SWARM_MAX_STEPS', '15'), 10),
      swarmConcurrency: parseInt(get('SWARM_CONCURRENCY', '4'), 10)
    }
  };

  return config;
}

function ensureAgentDirs(workspace) {
  const dirs = [
    path.join(workspace, '.agent'),
    path.join(workspace, '.agent', 'skill'),
    path.join(workspace, '.agent', 'logs')
  ];
  for (const d of dirs) fs.mkdirSync(d, { recursive: true });
}

/**
 * Merges `updates` (a flat { KEY: value } map, values already stringified)
 * into the existing .env file at envPath, preserving comments, ordering, and
 * any keys not being updated. Creates the file if it doesn't exist yet.
 * Keys whose value is undefined/null are skipped (left untouched).
 */
function saveEnvUpdates(envPath, updates) {
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8').split(/\r?\n/) : [];
  const remaining = new Map(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null));

  const nextLines = existing.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return line;
    const key = trimmed.slice(0, eq).trim();
    if (remaining.has(key)) {
      const value = remaining.get(key);
      remaining.delete(key);
      return `${key}=${value}`;
    }
    return line;
  });

  for (const [key, value] of remaining) {
    nextLines.push(`${key}=${value}`);
  }

  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  fs.writeFileSync(envPath, nextLines.join('\n').replace(/\n+$/, '\n'), 'utf8');
}

module.exports = { loadConfig, ensureAgentDirs, parseEnv, saveEnvUpdates };
