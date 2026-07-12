import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { usePoll } from '../hooks/usePoll';
import type { LogType } from '../types';

const TABS: { id: LogType; label: string }[] = [
  { id: 'sys', label: 'sys.log' },
  { id: 'react', label: 'react.log' },
  { id: 'llm', label: 'llm.log' }
];

export function LogsView() {
  const [tab, setTab] = useState<LogType>('sys');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const scrollRef = useRef<HTMLPreElement>(null);

  const { data, error, loading, refresh } = usePoll(() => api.logs(tab, 2000), autoRefresh ? 3000 : 0, true);

  // Re-fetch immediately when switching tabs (usePoll's active flag doesn't change on tab switch).
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (autoRefresh) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [data, autoRefresh]);

  return (
    <div className="view logs-view">
      <div className="view__header">
        <h1>Logs</h1>
        <p>Raw output from .agent/logs — refreshes every 3s while auto-refresh is on.</p>
      </div>

      <div className="toolbar">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab${t.id === tab ? ' tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="toolbar__actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button type="button" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="banner banner--danger">{error}</div>}

      {data && !data.exists ? (
        <div className="empty-state">No {tab}.log yet — it's created once the agent writes something.</div>
      ) : (
        <pre className="log-pane" ref={scrollRef}>
          {data?.content || (loading ? 'Loading…' : '(empty)')}
        </pre>
      )}
    </div>
  );
}
