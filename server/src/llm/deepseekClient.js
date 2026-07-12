'use strict';

/**
 * Thin client for DeepSeek's OpenAI-compatible /chat/completions endpoint,
 * including native function-calling ("tools") support -- DeepSeek's
 * deepseek-chat model implements the same tools/tool_calls contract as
 * OpenAI, which is far more reliable than parsing a text-based ReAct
 * protocol out of free-form completions.
 *
 * Does NOT throw if no API key is configured at construction time -- the key
 * can be supplied later at runtime via updateConfig() (e.g. from the UI
 * Settings panel). It only throws when a request is actually made without one.
 */
class DeepSeekClient {
  static DEFAULT_PROVIDER = 'deepseek';

  constructor(config, logger, agentName = 'llm', tokenTracker = null) {
    this.apiKey = config.deepseek.apiKey || '';
    this.baseUrl = (config.deepseek.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
    this.model = config.deepseek.model;
    this.temperature = config.deepseek.temperature;
    this.maxTokens = config.deepseek.maxTokens;
    this.logger = logger;
    this.agentName = agentName;
    this.tokenTracker = tokenTracker;
  }

  hasApiKey() {
    return Boolean(this.apiKey);
  }

  /** Applies a partial config update in place. Only defined fields are changed. */
  updateConfig({ apiKey, baseUrl, model, temperature, maxTokens } = {}) {
    if (apiKey !== undefined && apiKey !== '') this.apiKey = apiKey;
    if (baseUrl !== undefined && baseUrl !== '') this.baseUrl = baseUrl.replace(/\/+$/, '');
    if (model !== undefined && model !== '') this.model = model;
    if (temperature !== undefined && !Number.isNaN(temperature)) this.temperature = temperature;
    if (maxTokens !== undefined && !Number.isNaN(maxTokens)) this.maxTokens = maxTokens;
  }

  /** Safe-to-expose snapshot for the Settings UI -- never returns the full key. */
  getPublicConfig() {
    return {
      provider: DeepSeekClient.DEFAULT_PROVIDER,
      hasApiKey: this.hasApiKey(),
      apiKeyPreview: this.apiKey ? maskKey(this.apiKey) : null,
      baseUrl: this.baseUrl,
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens
    };
  }

  /**
   * Full request/response cycle. Returns the raw assistant message object
   * ({ role, content, tool_calls? }) so callers that need tool_calls (the
   * ReAct engine) can see them, while chat() below just extracts .content
   * for simple, tool-free use (e.g. the orchestrator's chat/task classifier).
   *
   * opts.tools, if provided, is an array of { name, description, schema }
   * (our internal shape) -- converted here to OpenAI/DeepSeek's
   * { type: 'function', function: { name, description, parameters } } shape.
   */
  async chatRaw(messages, opts = {}) {
    const agentName = opts.agentName || this.agentName;

    if (!this.hasApiKey()) {
      throw new Error('DeepSeek API key is not configured. Add it in Settings.');
    }

    const body = {
      model: opts.model || this.model,
      messages,
      temperature: opts.temperature ?? this.temperature,
      max_tokens: opts.maxTokens ?? this.maxTokens,
      stream: false
    };

    if (opts.tools?.length) {
      body.tools = opts.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.schema || { type: 'object', properties: {} }
        }
      }));
      if (opts.toolChoice) body.tool_choice = opts.toolChoice;
    }

    this.logger.llm(agentName, 'request', body);

    let res;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      this.logger.error(`DeepSeek request failed: ${err.message}`);
      throw err;
    }

    const text = await res.text();

    if (!res.ok) {
      this.logger.llm(agentName, 'response-error', text);
      this.logger.error(`DeepSeek API error ${res.status}: ${text}`);
      throw new Error(`DeepSeek API error ${res.status}: ${text}`);
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      this.logger.error(`Failed to parse DeepSeek response: ${text}`);
      throw err;
    }

    this.logger.llm(agentName, 'response', data);

    if (this.tokenTracker && data?.usage) {
      this.tokenTracker.record(agentName, data.usage);
    }

    return data?.choices?.[0]?.message ?? { role: 'assistant', content: '' };
  }

  /**
   * messages: [{role: 'system'|'user'|'assistant', content: string}]
   * returns: string content of the assistant reply (no tool-calling).
   */
  async chat(messages, opts = {}) {
    const message = await this.chatRaw(messages, opts);
    return message.content ?? '';
  }
}

function maskKey(key) {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

module.exports = { DeepSeekClient };
