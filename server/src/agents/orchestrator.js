'use strict';
const { createPlan } = require('./planner');
const { runSwarm, loadPlan } = require('./swarm');
const { generateReport } = require('./report');

const CLASSIFIER_SYSTEM_PROMPT = `You are the Orchestrator Agent for a local coding/work assistant.
The user is chatting with you from inside their project workspace.

Decide whether their message requires you to actually DO something in the
workspace (write/edit files, run commands, multi-step work) versus just
wanting a conversational reply, an explanation, or an opinion.

Respond with ONLY a JSON object, nothing else:
{"needs_task": true|false, "task": "<concise, self-contained restatement of the work to do, or empty string if none>", "reply": "<a direct conversational reply to give the user right now if needs_task is false, or a short 'on it' style acknowledgement if true>"}`;

function extractJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

class Orchestrator {
  constructor({ llm, logger, skillManager, workspace, config }) {
    this.llm = llm;
    this.logger = logger;
    this.skillManager = skillManager;
    this.workspace = workspace;
    this.config = config;
    this.history = [];
  }

  async handleMessage(userMessage, { onEvent } = {}) {
    const emit = (event, data) => onEvent && onEvent(event, data);

    this.history.push({ role: 'user', content: userMessage });

    const classifyMessages = [
      { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
      ...this.history.slice(-8)
    ];

    const raw = await this.llm.chat(classifyMessages, { agentName: 'orchestrator' });
    const decision = extractJsonObject(raw) || { needs_task: false, task: '', reply: raw };

    if (!decision.needs_task) {
      this.history.push({ role: 'assistant', content: decision.reply });
      this.logger.info(`Orchestrator: no task needed. Replied directly.`);
      return { type: 'chat', reply: decision.reply };
    }

    this.logger.info(`Orchestrator: task detected -> "${decision.task}"`);
    emit('task_detected', { task: decision.task });

    // 1. Planner
    emit('planning_started', {});
    const { plan, planPath } = await createPlan({
      llm: this.llm,
      logger: this.logger,
      skillManager: this.skillManager,
      workspace: this.workspace,
      task: decision.task,
      maxSteps: this.config.limits.plannerMaxSteps
    });
    emit('plan_ready', { plan, planPath });

    // 2. Swarm
    emit('swarm_started', { subTaskCount: plan['sub-tasks'].length });
    await runSwarm({
      llm: this.llm,
      logger: this.logger,
      skillManager: this.skillManager,
      workspace: this.workspace,
      plan,
      planPath,
      concurrency: this.config.limits.swarmConcurrency,
      maxSteps: this.config.limits.swarmMaxSteps
    });
    emit('swarm_finished', { plan });

    // 3. Report
    const finalPlan = loadPlan(planPath);
    const { content, reportPath, counts } = generateReport({ workspace: this.workspace, plan: finalPlan });
    emit('report_ready', { content, reportPath, counts });

    const replySummary =
      `Done. ${counts.done || 0}/${finalPlan['sub-tasks'].length} sub-tasks completed successfully` +
      `${counts.failed ? `, ${counts.failed} failed` : ''}${counts.blocked ? `, ${counts.blocked} blocked` : ''}.\n` +
      `Full report: ${reportPath}`;

    this.history.push({ role: 'assistant', content: replySummary });

    return { type: 'task', reply: replySummary, plan: finalPlan, report: content, reportPath };
  }
}

module.exports = { Orchestrator };
