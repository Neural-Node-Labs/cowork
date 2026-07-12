'use strict';
const fs = require('fs');
const path = require('path');
const { runReAct } = require('./reactEngine');
const { buildTools } = require('../tools');

const PLANNER_SYSTEM_PROMPT = `You are the Planner Agent in a multi-agent worker system.
Given a task description and read-only access to explore the target workspace,
produce a concrete execution plan broken into sub-tasks.

Use read_tool / glob_tool / grep_tool to understand the existing codebase/workspace
BEFORE writing the plan, when that context would change what you plan.

Your final answer (plain content, no further tool calls) MUST be a single JSON
object, and NOTHING else, matching exactly:

{
  "task": "<restated overall task>",
  "target-workspace": "<absolute path>",
  "sub-tasks": [
    {
      "task-id": "1",
      "task": "<what this sub-task accomplishes>",
      "command": "<concrete instruction or shell command the executing agent should run/do>",
      "validation": "<how to verify this sub-task succeeded>",
      "priority": 1,
      "status": "pending",
      "depend-on": []
    }
  ]
}

Rules for the plan:
- task-id values are strings, unique, starting at "1".
- depend-on is an array of task-id strings this sub-task must wait on (empty array if none).
- priority is an integer; lower runs first among tasks with no unmet dependencies.
- status is always "pending" in the initial plan.
- Keep sub-tasks atomic and independently verifiable.
- Your final message must contain ONLY the JSON object -- no prose, no markdown fences.`;

async function createPlan({ llm, logger, skillManager, workspace, task, maxSteps }) {
  const tools = buildTools();
  // Planner only gets read/explore tools -- it should not modify the workspace.
  const readOnlyTools = {
    read_tool: tools.read_tool,
    glob_tool: tools.glob_tool,
    grep_tool: tools.grep_tool
  };

  const result = await runReAct({
    llm,
    logger,
    agentName: 'planner',
    taskId: null,
    systemPrompt: PLANNER_SYSTEM_PROMPT,
    tools: readOnlyTools,
    skillManifest: skillManager.manifestText(),
    loadSkill: (name) => skillManager.load(name),
    ctx: { workspace, skillManager },
    maxSteps: maxSteps || 12,
    userGoal: `Task: ${task}\nTarget workspace: ${workspace}`
  });

  if (!result.success) {
    throw new Error('Planner failed to produce a plan (max steps exceeded).');
  }

  let plan;
  try {
    const jsonText = extractJson(result.final);
    plan = JSON.parse(jsonText);
  } catch (err) {
    logger.error(`Planner produced invalid JSON: ${result.final}`);
    throw new Error(`Planner produced invalid JSON plan: ${err.message}`);
  }

  validatePlan(plan);

  const planPath = path.join(workspace, '.agent', 'plan.json');
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
  logger.info(`Plan saved to ${planPath} (${plan['sub-tasks'].length} sub-tasks)`);

  return { plan, planPath };
}

function extractJson(text) {
  // Strip markdown fences if the model added them despite instructions.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object found in Final Answer');
  return candidate.slice(start, end + 1);
}

function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') throw new Error('plan is not an object');
  if (!plan.task) throw new Error('plan missing "task"');
  if (!plan['target-workspace']) throw new Error('plan missing "target-workspace"');
  if (!Array.isArray(plan['sub-tasks'])) throw new Error('plan missing "sub-tasks" array');

  const ids = new Set();
  for (const st of plan['sub-tasks']) {
    for (const field of ['task-id', 'task', 'command', 'validation', 'priority', 'status', 'depend-on']) {
      if (!(field in st)) throw new Error(`sub-task missing field "${field}": ${JSON.stringify(st)}`);
    }
    if (ids.has(st['task-id'])) throw new Error(`duplicate task-id: ${st['task-id']}`);
    ids.add(st['task-id']);
  }
  for (const st of plan['sub-tasks']) {
    for (const dep of st['depend-on']) {
      if (!ids.has(dep)) throw new Error(`sub-task ${st['task-id']} depends on unknown task-id ${dep}`);
    }
  }
}

module.exports = { createPlan, validatePlan, extractJson };
