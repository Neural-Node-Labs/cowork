'use strict';
const fs = require('fs');
const path = require('path');

const MAX_HISTORY = 500;

class TokenTracker {
  constructor(workspace) {
    this.filePath = path.join(workspace, '.agent', 'logs', 'tokens.json');
    this.state = this._load();
  }

  _load() {
    if (fs.existsSync(this.filePath)) {
      try {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      } catch {
        /* fall through to fresh state */
      }
    }
    return { prompt: 0, completion: 0, total: 0, byAgent: {}, history: [] };
  }

  _save() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  // usage: { prompt_tokens, completion_tokens, total_tokens } (DeepSeek/OpenAI-shaped)
  record(agentName, usage) {
    if (!usage) return;
    const prompt = usage.prompt_tokens || 0;
    const completion = usage.completion_tokens || 0;
    const total = usage.total_tokens || prompt + completion;

    this.state.prompt += prompt;
    this.state.completion += completion;
    this.state.total += total;

    if (!this.state.byAgent[agentName]) {
      this.state.byAgent[agentName] = { prompt: 0, completion: 0, total: 0, calls: 0 };
    }
    const a = this.state.byAgent[agentName];
    a.prompt += prompt;
    a.completion += completion;
    a.total += total;
    a.calls += 1;

    this.state.history.push({
      ts: new Date().toISOString(),
      agent: agentName,
      prompt,
      completion,
      total,
      runningTotal: this.state.total
    });
    if (this.state.history.length > MAX_HISTORY) {
      this.state.history = this.state.history.slice(-MAX_HISTORY);
    }

    this._save();
  }

  getSummary() {
    // reload from disk so multiple processes (server + CLI) stay in sync
    this.state = this._load();
    return this.state;
  }
}

module.exports = { TokenTracker };
