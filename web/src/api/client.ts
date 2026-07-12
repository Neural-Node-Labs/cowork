import type {
  ChatResponse,
  HealthResponse,
  LogsResponse,
  LogType,
  PlanResponse,
  ReasoningResponse,
  ReportResponse,
  SettingsResponse,
  SettingsUpdate,
  TokenSummary
} from '../types';

// Empty string = same-origin relative requests. This works both:
//  - in dev, via the Vite proxy (see vite.config.ts) forwarding /api to the backend
//  - in production/combined deployment, where the backend serves the built UI itself
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) message = parsed.error;
    } catch {
      /* not JSON, use raw text */
    }
    throw new Error(message || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),

  chat: (message: string) =>
    request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    }),

  logs: (type: LogType, tail = 1000) =>
    request<LogsResponse>(`/api/logs?type=${type}&tail=${tail}`),

  reasoning: (opts?: { taskId?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.taskId) params.set('taskId', opts.taskId);
    if (opts?.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return request<ReasoningResponse>(`/api/reasoning${qs ? `?${qs}` : ''}`);
  },

  tokens: () => request<TokenSummary>('/api/tokens'),

  plan: () => request<PlanResponse>('/api/plan'),

  report: () => request<ReportResponse>('/api/report'),

  getSettings: () => request<SettingsResponse>('/api/settings'),

  updateSettings: (update: SettingsUpdate) =>
    request<SettingsResponse>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(update)
    })
};

export { API_BASE };
