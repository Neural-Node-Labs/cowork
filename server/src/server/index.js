'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const { parseReactLog } = require('../logging/reactLogParser');
const { saveEnvUpdates } = require('../config');

function tailLines(filePath, maxLines) {
  if (!fs.existsSync(filePath)) return '';
  const content = fs.readFileSync(filePath, 'utf8');
  if (!maxLines) return content;
  const lines = content.split('\n');
  return lines.slice(Math.max(0, lines.length - maxLines)).join('\n');
}

const SETTINGS_FIELD_TO_ENV = {
  apiKey: 'DEEPSEEK_API_KEY',
  baseUrl: 'DEEPSEEK_BASE_URL',
  model: 'DEEPSEEK_MODEL',
  temperature: 'DEEPSEEK_TEMPERATURE',
  maxTokens: 'DEEPSEEK_MAX_TOKENS',
  plannerMaxSteps: 'PLANNER_MAX_STEPS',
  swarmMaxSteps: 'SWARM_MAX_STEPS',
  swarmConcurrency: 'SWARM_CONCURRENCY'
};

/**
 * Starts the cowork HTTP API (and, if a built frontend is present, serves it
 * as static files from the same origin). `orchestrator` is a live Orchestrator
 * instance (keeps chat history in memory across requests). `llm` is the same
 * DeepSeekClient instance orchestrator/planner/swarm all share, so updating
 * its config here takes effect immediately, no restart needed.
 */
function startServer({ orchestrator, llm, logger, tokenTracker, workspace, config, port, publicDir }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const logsDir = path.join(workspace, '.agent', 'logs');
  const planPath = path.join(workspace, '.agent', 'plan.json');
  const reportPath = path.join(workspace, '.agent', 'report.md');

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      workspace,
      model: config.deepseek.model,
      baseUrl: config.deepseek.baseUrl,
      hasApiKey: llm.hasApiKey()
    });
  });

  app.post('/api/chat', async (req, res) => {
    const message = (req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'message is required' });

    const events = [];
    try {
      const result = await orchestrator.handleMessage(message, {
        onEvent: (event, data) => events.push({ event, data, ts: new Date().toISOString() })
      });
      res.json({ ...result, events });
    } catch (err) {
      logger.error(err);
      res.status(500).json({ error: err.message, events });
    }
  });

  app.get('/api/logs', (req, res) => {
    const type = req.query.type || 'sys';
    const allowed = { sys: 'sys.log', react: 'react.log', llm: 'llm.log' };
    if (!allowed[type]) return res.status(400).json({ error: 'type must be sys, react, or llm' });

    const filePath = path.join(logsDir, allowed[type]);
    const tail = req.query.tail ? parseInt(req.query.tail, 10) : 1000;
    res.json({
      type,
      path: filePath,
      exists: fs.existsSync(filePath),
      content: tailLines(filePath, tail)
    });
  });

  app.get('/api/reasoning', (req, res) => {
    const filePath = path.join(logsDir, 'react.log');
    let entries = parseReactLog(filePath);
    if (req.query.taskId) entries = entries.filter((e) => e.taskId === req.query.taskId);
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 300;
    res.json({ entries: entries.slice(-limit) });
  });

  app.get('/api/tokens', (req, res) => {
    res.json(tokenTracker.getSummary());
  });

  app.get('/api/plan', (req, res) => {
    if (!fs.existsSync(planPath)) return res.json({ exists: false, plan: null });
    try {
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      res.json({ exists: true, plan });
    } catch (err) {
      res.status(500).json({ error: `failed to parse plan.json: ${err.message}` });
    }
  });

  app.get('/api/report', (req, res) => {
    if (!fs.existsSync(reportPath)) return res.json({ exists: false, content: null });
    const stat = fs.statSync(reportPath);
    res.json({
      exists: true,
      content: fs.readFileSync(reportPath, 'utf8'),
      updatedAt: stat.mtime.toISOString()
    });
  });

  // --- Settings: view/update LLM config (incl. API key) from the UI ---

  app.get('/api/settings', (req, res) => {
    res.json({
      ...llm.getPublicConfig(),
      limits: { ...config.limits },
      envPath: config.envPath
    });
  });

  app.post('/api/settings', (req, res) => {
    const body = req.body || {};
    const allowedFields = Object.keys(SETTINGS_FIELD_TO_ENV);
    const updates = {};

    for (const field of allowedFields) {
      if (!(field in body)) continue;
      let value = body[field];
      if (typeof value === 'string') value = value.trim();
      if (value === '') continue; // blank means "leave unchanged", esp. for apiKey
      updates[field] = value;
    }

    // Basic validation before anything is written.
    if (updates.temperature !== undefined) {
      const t = Number(updates.temperature);
      if (Number.isNaN(t) || t < 0 || t > 2) {
        return res.status(400).json({ error: 'temperature must be a number between 0 and 2' });
      }
      updates.temperature = t;
    }
    if (updates.maxTokens !== undefined) {
      const m = parseInt(updates.maxTokens, 10);
      if (Number.isNaN(m) || m <= 0) {
        return res.status(400).json({ error: 'maxTokens must be a positive integer' });
      }
      updates.maxTokens = m;
    }
    for (const field of ['plannerMaxSteps', 'swarmMaxSteps', 'swarmConcurrency']) {
      if (updates[field] !== undefined) {
        const n = parseInt(updates[field], 10);
        if (Number.isNaN(n) || n <= 0) {
          return res.status(400).json({ error: `${field} must be a positive integer` });
        }
        updates[field] = n;
      }
    }
    if (updates.baseUrl !== undefined && !/^https?:\/\//.test(updates.baseUrl)) {
      return res.status(400).json({ error: 'baseUrl must start with http:// or https://' });
    }

    try {
      // Persist to .agent/.env so it survives a restart...
      const envUpdates = {};
      for (const [field, envKey] of Object.entries(SETTINGS_FIELD_TO_ENV)) {
        if (updates[field] !== undefined) envUpdates[envKey] = updates[field];
      }
      if (Object.keys(envUpdates).length) {
        saveEnvUpdates(config.envPath, envUpdates);
      }

      // ...and apply immediately in-memory, no restart needed.
      llm.updateConfig(updates);
      if (updates.plannerMaxSteps !== undefined) config.limits.plannerMaxSteps = updates.plannerMaxSteps;
      if (updates.swarmMaxSteps !== undefined) config.limits.swarmMaxSteps = updates.swarmMaxSteps;
      if (updates.swarmConcurrency !== undefined) config.limits.swarmConcurrency = updates.swarmConcurrency;
      config.deepseek.baseUrl = llm.baseUrl;
      config.deepseek.model = llm.model;
      config.deepseek.temperature = llm.temperature;
      config.deepseek.maxTokens = llm.maxTokens;

      logger.info('Settings updated from UI.');
      res.json({ ...llm.getPublicConfig(), limits: { ...config.limits }, envPath: config.envPath });
    } catch (err) {
      logger.error(`Failed to save settings: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Static frontend (combined single-container deployment) ---
  if (publicDir && fs.existsSync(path.join(publicDir, 'index.html'))) {
    app.use(express.static(publicDir));
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
    logger.info(`Serving frontend from ${publicDir}`);
  }

  const server = app.listen(port, () => {
    logger.info(`cowork API server listening on http://localhost:${port}`);
  });

  return server;
}

module.exports = { startServer };
