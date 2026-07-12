'use strict';
const fs = require('fs');
const { runReAct } = require('./reactEngine');
const { buildTools } = require('../tools');

const SWARM_SYSTEM_PROMPT = `You are a Swarm worker agent in a multi-agent system.
You are assigned ONE sub-task from a larger plan. You have full read/write access
to the target workspace via your tools. Complete the sub-task, then validate your
own work using the validation criteria you were given.

Your final answer (plain content, no further tool calls) MUST be a single JSON
object, and NOTHING else:

{
  "status": "done" | "failed",
  "summary": "<what you did>",
  "validation_result": "<what you observed when checking the validation criteria>"
}

Only report "done" if you actually verified the validation criteria (e.g. by
reading the file back, or running a command and checking its output). If you
cannot complete the sub-task after reasonable effort, report "failed" with
a clear explanation in "summary".`;

function loadPlan(planPath) {
  return JSON.parse(fs.readFileSync(planPath, 'utf8'));
}

function savePlan(planPath, plan) {
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');
}

function buildWaves(subTasks) {
  // Groups sub-tasks into dependency waves (topological levels).
  const resolved = new Set();
  const waves = [];
  let remaining = [...subTasks];

  while (remaining.length) {
    const wave = remaining.filter((t) => t['depend-on'].every((d) => resolved.has(d)));
    if (!wave.length) {
      throw new Error(
        `Circular or unresolvable dependency among: ${remaining.map((t) => t['task-id']).join(', ')}`
      );
    }
    wave.sort((a, b) => a.priority - b.priority);
    waves.push(wave);
    wave.forEach((t) => resolved.add(t['task-id']));
    remaining = remaining.filter((t) => !resolved.has(t['task-id']));
  }
  return waves;
}

async function runSubTask({ llm, logger, skillManager, workspace, plan, planPath, subTask, maxSteps }) {
  const tools = buildTools();
  subTask.status = 'in-progress';
  savePlan(planPath, plan);
  logger.info(`Swarm worker starting task-id ${subTask['task-id']}: ${subTask.task}`);

  const goal =
    `Overall task: ${plan.task}\n` +
    `Your sub-task (id ${subTask['task-id']}): ${subTask.task}\n` +
    `Suggested command/instruction: ${subTask.command}\n` +
    `Validation criteria: ${subTask.validation}\n` +
    `Target workspace: ${workspace}`;

  let result;
  try {
    result = await runReAct({
      llm,
      logger,
      agentName: 'swarm',
      taskId: subTask['task-id'],
      systemPrompt: SWARM_SYSTEM_PROMPT,
      tools,
      skillManifest: skillManager.manifestText(),
      loadSkill: (name) => skillManager.load(name),
      ctx: { workspace, skillManager },
      maxSteps: maxSteps || 15,
      userGoal: goal
    });
  } catch (err) {
    logger.error(`Swarm worker task-id ${subTask['task-id']} crashed: ${err.message}`);
    subTask.status = 'failed';
    subTask.result = { status: 'failed', summary: err.message, validation_result: null };
    savePlan(planPath, plan);
    return subTask;
  }

  if (!result.success) {
    subTask.status = 'failed';
    subTask.result = { status: 'failed', summary: 'max steps exceeded', validation_result: null };
    savePlan(planPath, plan);
    return subTask;
  }

  let parsed;
  try {
    const start = result.final.indexOf('{');
    const end = result.final.lastIndexOf('}');
    parsed = JSON.parse(result.final.slice(start, end + 1));
  } catch {
    parsed = { status: 'failed', summary: result.final, validation_result: null };
  }

  subTask.status = parsed.status === 'done' ? 'done' : 'failed';
  subTask.result = parsed;
  savePlan(planPath, plan);
  logger.info(`Swarm worker finished task-id ${subTask['task-id']} with status=${subTask.status}`);
  return subTask;
}

/**
 * Executes the full plan wave by wave, respecting depend-on, running up to
 * `concurrency` sub-tasks in parallel within a wave. If any dependency of a
 * later sub-task failed, that sub-task is marked "blocked" and skipped.
 */
async function runSwarm({ llm, logger, skillManager, workspace, plan, planPath, concurrency = 4, maxSteps = 15 }) {
  const waves = buildWaves(plan['sub-tasks']);
  const failedIds = new Set();

  for (const wave of waves) {
    const runnable = [];
    for (const subTask of wave) {
      const blockedBy = subTask['depend-on'].filter((d) => failedIds.has(d));
      if (blockedBy.length) {
        subTask.status = 'blocked';
        subTask.result = {
          status: 'failed',
          summary: `Skipped: dependency task(s) failed: ${blockedBy.join(', ')}`,
          validation_result: null
        };
        failedIds.add(subTask['task-id']);
        savePlan(planPath, plan);
        continue;
      }
      runnable.push(subTask);
    }

    // Run this wave with bounded concurrency.
    let idx = 0;
    async function worker() {
      while (idx < runnable.length) {
        const subTask = runnable[idx++];
        const done = await runSubTask({ llm, logger, skillManager, workspace, plan, planPath, subTask, maxSteps });
        if (done.status !== 'done') failedIds.add(done['task-id']);
      }
    }
    const workers = Array.from({ length: Math.min(concurrency, runnable.length) }, worker);
    await Promise.all(workers);
  }

  return plan;
}

module.exports = { runSwarm, buildWaves, loadPlan, savePlan };
