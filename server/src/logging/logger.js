'use strict';
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(workspace) {
    this.logDir = path.join(workspace, '.agent', 'logs');
    fs.mkdirSync(this.logDir, { recursive: true });
    this.reactLog = path.join(this.logDir, 'react.log');
    this.llmLog = path.join(this.logDir, 'llm.log');
    this.sysLog = path.join(this.logDir, 'sys.log');
  }

  _append(file, text) {
    fs.appendFileSync(file, text + '\n');
  }

  _ts() {
    return new Date().toISOString();
  }

  // Thought / Action / Observation entries from Planner & Swarm agents
  react(agentName, taskId, kind, content) {
    const header = `[${this._ts()}] [${agentName}]${taskId ? ` [task:${taskId}]` : ''} ${kind.toUpperCase()}:`;
    this._append(this.reactLog, `${header}\n${content}\n`);
  }

  // Raw LLM request/response pairs
  llm(agentName, direction, payload) {
    const header = `[${this._ts()}] [${agentName}] ${direction.toUpperCase()}`;
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    this._append(this.llmLog, `${header}\n${body}\n`);
  }

  info(msg) {
    this._append(this.sysLog, `[${this._ts()}] [INFO] ${msg}`);
  }

  error(msg) {
    const text = msg instanceof Error ? `${msg.message}\n${msg.stack}` : msg;
    this._append(this.sysLog, `[${this._ts()}] [ERROR] ${text}`);
  }
}

module.exports = { Logger };
