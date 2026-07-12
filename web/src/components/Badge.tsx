import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'thought' | 'action' | 'observation' | 'final';
}

const toneVar: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'var(--text-muted)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  thought: 'var(--thought)',
  action: 'var(--action)',
  observation: 'var(--observation)',
  final: 'var(--final)'
};

export function Badge({ children, tone = 'default' }: BadgeProps) {
  const color = toneVar[tone];
  return (
    <span
      className="badge"
      style={{
        color,
        borderColor: color
      }}
    >
      {children}
    </span>
  );
}
