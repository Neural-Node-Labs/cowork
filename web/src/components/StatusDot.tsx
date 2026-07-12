interface StatusDotProps {
  ok: boolean | null;
}

export function StatusDot({ ok }: StatusDotProps) {
  const color = ok === null ? 'var(--text-faint)' : ok ? 'var(--success)' : 'var(--danger)';
  const label = ok === null ? 'checking connection…' : ok ? 'connected' : 'disconnected';
  return (
    <span className="status-dot" title={label}>
      <span className="status-dot__core" style={{ backgroundColor: color }} />
    </span>
  );
}
