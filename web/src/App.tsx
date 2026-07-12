import { useState } from 'react';
import { Sidebar, type ViewId } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { LogsView } from './components/LogsView';
import { ReasoningView } from './components/ReasoningView';
import { TokensView } from './components/TokensView';
import { ReportView } from './components/ReportView';
import { SettingsView } from './components/SettingsView';
import { api } from './api/client';
import { usePoll } from './hooks/usePoll';

function App() {
  const [view, setView] = useState<ViewId>('chat');
  const { data: health } = usePoll(() => api.health(), 10000, true);

  return (
    <div className="app-shell">
      <Sidebar active={view} onSelect={setView} connected={health ? health.ok : null} model={health?.model} />
      <main className="app-shell__main">
        {view === 'chat' && <ChatView onNavigate={setView} />}
        {view === 'logs' && <LogsView />}
        {view === 'reasoning' && <ReasoningView />}
        {view === 'tokens' && <TokensView />}
        {view === 'report' && <ReportView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default App;
