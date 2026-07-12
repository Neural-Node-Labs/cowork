import { api } from '../api/client';
import { usePoll } from '../hooks/usePoll';
import { Sparkline } from './Sparkline';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="stat-card__value">{value.toLocaleString()}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

export function TokensView() {
  const { data, error, loading, refresh } = usePoll(() => api.tokens(), 4000, true);

  const history = data?.history ?? [];
  const runningTotals = history.map((h) => h.runningTotal);

  const agentRows = data ? Object.entries(data.byAgent).sort((a, b) => b[1].total - a[1].total) : [];

  return (
    <div className="view tokens-view">
      <div className="view__header">
        <h1>Tokens</h1>
        <p>Accumulated DeepSeek usage across every agent, persisted to .agent/logs/tokens.json.</p>
      </div>

      <div className="toolbar">
        <div />
        <div className="toolbar__actions">
          <button type="button" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="banner banner--danger">{error}</div>}

      <div className="stat-grid">
        <StatCard label="Total tokens" value={data?.total ?? 0} />
        <StatCard label="Prompt tokens" value={data?.prompt ?? 0} />
        <StatCard label="Completion tokens" value={data?.completion ?? 0} />
      </div>

      <div className="panel">
        <div className="panel__title">Cumulative usage over time</div>
        <Sparkline values={runningTotals} />
      </div>

      <div className="panel">
        <div className="panel__title">By agent</div>
        {agentRows.length === 0 ? (
          <div className="empty-state">No usage recorded yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Calls</th>
                <th>Prompt</th>
                <th>Completion</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {agentRows.map(([agent, s]) => (
                <tr key={agent}>
                  <td>{agent}</td>
                  <td>{s.calls}</td>
                  <td>{s.prompt.toLocaleString()}</td>
                  <td>{s.completion.toLocaleString()}</td>
                  <td>{s.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
