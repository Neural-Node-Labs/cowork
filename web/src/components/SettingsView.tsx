import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { SettingsResponse } from '../types';

interface FormState {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: string;
  maxTokens: string;
  plannerMaxSteps: string;
  swarmMaxSteps: string;
  swarmConcurrency: string;
}

function toFormState(s: SettingsResponse): FormState {
  return {
    apiKey: '',
    baseUrl: s.baseUrl,
    model: s.model,
    temperature: String(s.temperature),
    maxTokens: String(s.maxTokens),
    plannerMaxSteps: String(s.limits.plannerMaxSteps),
    swarmMaxSteps: String(s.limits.swarmMaxSteps),
    swarmConcurrency: String(s.limits.swarmConcurrency)
  };
}

export function SettingsView() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s);
        setForm(toFormState(s));
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const result = await api.updateSettings({
        apiKey: form.apiKey || undefined,
        baseUrl: form.baseUrl,
        model: form.model,
        temperature: Number(form.temperature),
        maxTokens: Number(form.maxTokens),
        plannerMaxSteps: Number(form.plannerMaxSteps),
        swarmMaxSteps: Number(form.swarmMaxSteps),
        swarmConcurrency: Number(form.swarmConcurrency)
      });
      setSettings(result);
      setForm(toFormState(result));
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view settings-view">
      <div className="view__header">
        <h1>Settings</h1>
        <p>LLM configuration, stored in {settings?.envPath || '.agent/.env'} on the machine running cowork.</p>
      </div>

      {error && <div className="banner banner--danger">{error}</div>}

      {!settings?.hasApiKey && (
        <div className="banner banner--warning">
          No DeepSeek API key configured yet — chat and tasks won't work until you add one below.
        </div>
      )}

      {!form ? (
        <div className="empty-state">Loading settings…</div>
      ) : (
        <form className="settings-form" onSubmit={handleSave}>
          <div className="panel">
            <div className="panel__title">DeepSeek API</div>

            <div className="field">
              <span className="field__label">Provider</span>
              <div className="provider-pill">{settings?.provider || 'deepseek'} (default, only provider supported)</div>
            </div>

            <label className="field">
              <span className="field__label">API key</span>
              <div className="field__input-row">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.apiKey}
                  onChange={(e) => update('apiKey', e.target.value)}
                  placeholder={
                    settings?.hasApiKey ? `Currently set (${settings.apiKeyPreview}) — leave blank to keep` : 'sk-...'
                  }
                  autoComplete="off"
                />
                <button type="button" className="link-button" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <label className="field">
              <span className="field__label">Base URL</span>
              <input
                type="text"
                value={form.baseUrl}
                onChange={(e) => update('baseUrl', e.target.value)}
                placeholder="https://api.deepseek.com"
              />
            </label>

            <label className="field">
              <span className="field__label">Model</span>
              <input
                type="text"
                value={form.model}
                onChange={(e) => update('model', e.target.value)}
                placeholder="deepseek-chat"
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span className="field__label">Temperature</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={form.temperature}
                  onChange={(e) => update('temperature', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">Max tokens</span>
                <input
                  type="number"
                  min="1"
                  value={form.maxTokens}
                  onChange={(e) => update('maxTokens', e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="panel">
            <button
              type="button"
              className="link-button panel__title panel__title--toggle"
              onClick={() => setAdvancedOpen((v) => !v)}
            >
              Advanced (agent limits) {advancedOpen ? '▾' : '▸'}
            </button>
            {advancedOpen && (
              <div className="field-row field-row--three">
                <label className="field">
                  <span className="field__label">Planner max steps</span>
                  <input
                    type="number"
                    min="1"
                    value={form.plannerMaxSteps}
                    onChange={(e) => update('plannerMaxSteps', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field__label">Swarm max steps</span>
                  <input
                    type="number"
                    min="1"
                    value={form.swarmMaxSteps}
                    onChange={(e) => update('swarmMaxSteps', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field__label">Swarm concurrency</span>
                  <input
                    type="number"
                    min="1"
                    value={form.swarmConcurrency}
                    onChange={(e) => update('swarmConcurrency', e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="settings-form__actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            {savedAt && Date.now() - savedAt < 4000 && <span className="settings-form__saved">Saved ✓</span>}
          </div>
        </form>
      )}
    </div>
  );
}
