#!/usr/bin/env node
'use strict';
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const { loadConfig, ensureAgentDirs } = require('../src/config');
const { Logger } = require('../src/logging/logger');
const { TokenTracker } = require('../src/logging/tokenTracker');
const { DeepSeekClient } = require('../src/llm/deepseekClient');
const { SkillManager } = require('../src/skills/skillManager');
const { seedBuiltinSkills } = require('../src/skills/seedBuiltinSkills');
const { Orchestrator } = require('../src/agents/orchestrator');

function printUsage() {
  console.log(`cowork - multi-agent worker CLI

Usage:
  cowork chat               Start an interactive chat session in the current directory
  cowork chat "<message>"   Send a single message and exit
  cowork serve [--port N]   Start the HTTP API (+ built-in UI if present). Default port 5175.

Workspace is always the current working directory.
Config (incl. DEEPSEEK_API_KEY) can be set via ./.agent/.env, or later from the
Settings panel in the UI once "cowork serve" is running -- no key is required
just to start the server.

Env vars: PORT / COWORK_PORT (serve port), COWORK_PUBLIC_DIR (built frontend to serve).
`);
}

async function main() {
  const [, , cmd, ...rest] = process.argv;

  if (!cmd || cmd === '-h' || cmd === '--help') {
    printUsage();
    process.exit(cmd ? 0 : 1);
  }

  if (cmd !== 'chat' && cmd !== 'serve') {
    console.error(`Unknown command: ${cmd}\n`);
    printUsage();
    process.exit(1);
  }

  const workspace = process.cwd();
  ensureAgentDirs(workspace);
  const config = loadConfig(workspace);
  const logger = new Logger(workspace);

  if (!config.envFound) {
    console.log(
      `(!) No .agent/.env found in ${workspace}. Copy .agent/.env.example there and set DEEPSEEK_API_KEY,` +
        ` or start "cowork serve" and set it from the Settings panel in the UI.`
    );
  }

  const tokenTracker = new TokenTracker(workspace);
  const llm = new DeepSeekClient(config, logger, 'orchestrator', tokenTracker);

  if (!llm.hasApiKey()) {
    console.log('(!) No DeepSeek API key configured yet.');
  }

  seedBuiltinSkills(workspace, __dirname, logger);
  const skillManager = new SkillManager(workspace, logger);
  const orchestrator = new Orchestrator({ llm, logger, skillManager, workspace, config });

  if (cmd === 'serve') {
    const portFlagIdx = rest.indexOf('--port');
    const port =
      portFlagIdx !== -1
        ? parseInt(rest[portFlagIdx + 1], 10)
        : parseInt(process.env.PORT || process.env.COWORK_PORT || '5175', 10);

    const candidatePublicDirs = [
      path.join(__dirname, '..', 'public'), // source tree: bin/cowork.js -> ../public
      path.join(__dirname, 'public') // bundled single-file: cowork.cjs -> ./public (sibling)
    ];
    const publicDir =
      process.env.COWORK_PUBLIC_DIR ||
      candidatePublicDirs.find((p) => fs.existsSync(path.join(p, 'index.html'))) ||
      candidatePublicDirs[0];

    const { startServer } = require('../src/server');
    startServer({ orchestrator, llm, logger, tokenTracker, workspace, config, port, publicDir });
    console.log(`cowork API server running at http://localhost:${port}`);
    console.log(`workspace: ${workspace}`);
    if (fs.existsSync(path.join(publicDir, 'index.html'))) {
      console.log(`UI available at http://localhost:${port}`);
    } else {
      console.log(`No built UI found at ${publicDir} -- API only. Run the cowork-ui dev server separately, or build it and point COWORK_PUBLIC_DIR at its dist/.`);
    }
    return;
  }

  const onEvent = (event, data) => {
    switch (event) {
      case 'task_detected':
        console.log(`\n→ Task detected: ${data.task}`);
        break;
      case 'planning_started':
        console.log(`→ Planner agent is working (see .agent/logs/react.log)...`);
        break;
      case 'plan_ready':
        console.log(`→ Plan saved: ${data.planPath} (${data.plan['sub-tasks'].length} sub-tasks)`);
        break;
      case 'swarm_started':
        console.log(`→ Swarm agent working on ${data.subTaskCount} sub-task(s)...`);
        break;
      case 'swarm_finished':
        console.log(`→ Swarm finished.`);
        break;
      case 'report_ready':
        console.log(`→ Report written: ${data.reportPath}`);
        break;
    }
  };

  const singleMessage = rest.join(' ').trim();

  if (singleMessage) {
    try {
      const result = await orchestrator.handleMessage(singleMessage, { onEvent });
      console.log(`\n${result.reply}`);
    } catch (err) {
      logger.error(err);
      console.error(`\nError: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  console.log(`cowork chat — workspace: ${workspace}`);
  console.log(`Model: ${config.deepseek.model} @ ${config.deepseek.baseUrl}`);
  console.log(`Type your message. Ctrl+C to exit.\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.prompt();

  rl.on('line', async (line) => {
    const msg = line.trim();
    if (!msg) {
      rl.prompt();
      return;
    }
    try {
      const result = await orchestrator.handleMessage(msg, { onEvent });
      console.log(`\n${result.reply}\n`);
    } catch (err) {
      logger.error(err);
      console.error(`\nError: ${err.message}\n`);
    }
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nbye.');
    process.exit(0);
  });
}

main();
