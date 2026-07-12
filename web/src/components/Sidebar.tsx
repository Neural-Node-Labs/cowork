import { ThemePicker } from './ThemePicker';
import { StatusDot } from './StatusDot';

export type ViewId = 'chat' | 'logs' | 'reasoning' | 'tokens' | 'report' | 'settings';

interface NavItem {
  id: ViewId;
  label: string;
  hint: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'chat', label: 'Chat', hint: 'Talk to the orchestrator' },
  { id: 'logs', label: 'Logs', hint: 'sys / react / llm' },
  { id: 'reasoning', label: 'Reasoning', hint: 'Thought · Action · Observation' },
  { id: 'tokens', label: 'Tokens', hint: 'Usage across agents' },
  { id: 'report', label: 'Report', hint: 'Latest task report' },
  { id: 'settings', label: 'Settings', hint: 'LLM config & API key' }
];

interface SidebarProps {
  active: ViewId;
  onSelect: (id: ViewId) => void;
  connected: boolean | null;
  model?: string;
}

export function Sidebar({ active, onSelect, connected, model }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">▸</span>
        <span className="sidebar__brand-name">cowork</span>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar__nav-item${item.id === active ? ' sidebar__nav-item--active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            <span className="sidebar__nav-label">{item.label}</span>
            <span className="sidebar__nav-hint">{item.hint}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__status">
          <StatusDot ok={connected} />
          <span className="sidebar__status-text">{model || 'not connected'}</span>
        </div>
        <ThemePicker />
      </div>
    </aside>
  );
}
