'use strict';

const LOAD_SKILL_TOOL = {
  name: 'load_skill',
  description:
    'Load the full instructions body of a registered skill by name (see the skill list in your ' +
    'system prompt for what is available). Call this before attempting a task that matches a ' +
    "skill's description or triggers.",
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Exact skill name from the registered skill list.' }
    },
    required: ['name']
  }
};

function buildToolSchemas(tools) {
  return [...Object.values(tools).map((t) => ({ name: t.name, description: t.description, schema: t.schema })), LOAD_SKILL_TOOL];
}

/**
 * Runs an agent loop using DeepSeek's native function-calling: the model
 * either returns tool_calls (which we execute and feed back as `tool` role
 * messages) or plain content with no tool_calls (the final answer).
 *
 * Every step is still logged via logger.react(...) with the same
 * thought/action/observation/final kinds as before, so react.log and the
 * UI's Reasoning view are unchanged by this being function-calling under
 * the hood rather than a parsed text protocol.
 *
 * @param {object} opts
 *  - llm: DeepSeekClient
 *  - logger: Logger
 *  - agentName: string (for logs)
 *  - taskId: string|null
 *  - systemPrompt: string (goal + final-answer format instructions specific to caller)
 *  - tools: tool registry (name -> {name, description, schema, run(args, ctx)})
 *  - skillManifest: string
 *  - loadSkill: (name) => string|null
 *  - ctx: { workspace, skillManager }
 *  - maxSteps: number
 *  - userGoal: string (the task/goal fed as the first user message)
 */
async function runReAct(opts) {
  const {
    llm,
    logger,
    agentName,
    taskId = null,
    systemPrompt,
    tools,
    skillManifest,
    loadSkill,
    ctx,
    maxSteps = 12,
    userGoal
  } = opts;

  const toolSchemas = buildToolSchemas(tools);

  const fullSystemPrompt =
    `${systemPrompt}\n\n` +
    `You have tools available (use them via function calling -- do not describe calling them in text, ` +
    `actually call them). Call one or more tools per turn as needed; once you have everything required, ` +
    `respond with your final answer as plain content and no tool calls.\n\n` +
    `Available skills (headers only -- call load_skill to see full instructions for one):\n${skillManifest}`;

  const messages = [
    { role: 'system', content: fullSystemPrompt },
    { role: 'user', content: userGoal }
  ];

  for (let step = 0; step < maxSteps; step++) {
    const message = await llm.chatRaw(messages, { agentName, tools: toolSchemas });
    messages.push(message);

    const toolCalls = message.tool_calls || [];

    if (message.content) {
      logger.react(agentName, taskId, toolCalls.length ? 'thought' : 'final', message.content);
    }

    if (!toolCalls.length) {
      return { success: true, final: message.content || '', steps: step + 1 };
    }

    for (const call of toolCalls) {
      const toolName = call.function?.name;
      let args = {};
      try {
        args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = { _raw: call.function?.arguments };
      }

      logger.react(agentName, taskId, 'action', `${toolName}[${JSON.stringify(args)}]`);

      let observation;
      if (toolName === 'load_skill') {
        const body = loadSkill(args.name);
        observation = body ? `Skill "${args.name}" loaded:\n${body}` : `ERROR: no skill named "${args.name}"`;
      } else if (tools[toolName]) {
        try {
          observation = tools[toolName].run(args, ctx);
        } catch (err) {
          observation = `ERROR: ${err.message}`;
        }
      } else {
        observation = `ERROR: unknown tool "${toolName}". Available: ${Object.keys(tools).join(', ')}, load_skill`;
      }

      const obsText = typeof observation === 'string' ? observation : JSON.stringify(observation);
      logger.react(agentName, taskId, 'observation', obsText);

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: obsText
      });
    }
  }

  logger.error(`${agentName}${taskId ? ` [task:${taskId}]` : ''} hit maxSteps (${maxSteps}) without a final answer`);
  return { success: false, final: null, steps: maxSteps, error: 'max_steps_exceeded' };
}

module.exports = { runReAct, buildToolSchemas };
