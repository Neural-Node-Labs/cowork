import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { usePoll } from '../hooks/usePoll';
import type { ReasoningKind, SubTaskStatus } from '../types';
import { Badge } from './Badge';

const KIND_TONE: Record<ReasoningKind, 'thought' | 'action' | 'observation' | 'final'> = {
  thought: 'thought',
  action: 'action',
  observation: 'observation',
  final: 'final'
};

const KIND_MARK: Record<ReasoningKind, string> = {
  thought: 'T',
  action: 'A',
  observation: 'O',
  final: 'F'
};

const STATUS_TONE: Record<SubTaskStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  pending: 'default',
  'in-progress': 'warning',
  done: 'success',
  failed: 'danger',
  blocked: 'danger'
};

export function ReasoningView() {
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [follow, setFollow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: reasoningData, error, loading, refresh } = usePoll(() => api.reasoning({ limit: 400 }), 3000, true);
  const { data: planData } = usePoll(() => api.plan(), 3000, true);

  const entries = reasoningData?.entries ?? [];
  const agents = useMemo(() => {
    const set = new Set(entries.map((e) => e.agent));
    return ['all', ...Array.from(set)];
  }, [entries]);

  const filtered = agentFilter === 'all' ? entries : entries.filter((e) => e.agent === agentFilter);

  useEffect(() => {
    if (follow) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [filtered, follow]);

  return (
    <div className="view reasoning-view">
      <div className="view__header">
        <h1>Reasoning</h1>
        <p>Live Thought → Action → Observation trail from the Planner and Swarm agents.</p>
      </div>

      {planData?.plan && (
        <div className="plan-strip">
          <span className="plan-strip__task">{planData.plan.task}</span>
          <div className="plan-strip__chips">
            {planData.plan['sub-tasks'].map((t) => (
              <span key={t['task-id']} className="plan-chip">
                <Badge tone={STATUS_TONE[t.status]}>{t['task-id']}</Badge>
                <span className="plan-chip__label">{t.task}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="tabs">
          {agents.map((a) => (
            <button
              key={a}
              type="button"
              className={`tab${a === agentFilter ? ' tab--active' : ''}`}
              onClick={() => setAgentFilter(a)}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="toolbar__actions">
          <label className="toggle">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
            Follow
          </label>
          <button type="button" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="banner banner--danger">{error}</div>}

      {!filtered.length ? (
        <div className="empty-state">
          No reasoning steps yet — they'll appear here once the Planner or Swarm starts working.
        </div>
      ) : (
        <div className="transcript" ref={scrollRef}>
          {filtered.map((e, i) => (
            <div key={i} className="transcript__entry" style={{ borderLeftColor: `var(--${e.kind})` }}>
              <div className="transcript__gutter">
                <span className="transcript__mark" style={{ color: `var(--${e.kind})` }}>
                  {KIND_MARK[e.kind]}
                </span>
              </div>
              <div className="transcript__body">
                <div className="transcript__meta">
                  <Badge tone={KIND_TONE[e.kind]}>{e.kind}</Badge>
                  <span className="transcript__agent">{e.agent}</span>
                  {e.taskId && <span className="transcript__task">task {e.taskId}</span>}
                  <span className="transcript__time">{new Date(e.timestamp).toLocaleTimeString()}</span>
                </div>
                <pre className="transcript__content">{e.content}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
