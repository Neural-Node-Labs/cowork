import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { ChatEvent, ChatMessage } from '../types';
import { Badge } from './Badge';
import type { ViewId } from './Sidebar';

const EVENT_LABEL: Record<string, string> = {
  task_detected: 'Task detected',
  planning_started: 'Planner is working',
  plan_ready: 'Plan ready',
  swarm_started: 'Swarm working',
  swarm_finished: 'Swarm finished',
  report_ready: 'Report ready'
};

function PipelineTrail({ events }: { events: ChatEvent[] }) {
  if (!events.length) return null;
  return (
    <div className="pipeline-trail">
      {events.map((e, i) => (
        <span key={i} className="pipeline-trail__step">
          <span className="pipeline-trail__dot" />
          {EVENT_LABEL[e.event] || e.event}
        </span>
      ))}
    </div>
  );
}

interface ChatViewProps {
  onNavigate: (view: ViewId) => void;
}

export function ChatView({ onNavigate }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hi — I'm the cowork orchestrator. Tell me what you need done in this workspace, or just chat."
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const missingKey = error?.toLowerCase().includes('api key');

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setSending(true);
    try {
      const result = await api.chat(text);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.reply, events: result.events, type: result.type }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="view chat-view">
      <div className="view__header">
        <h1>Chat</h1>
        <p>Ask a question or hand off a task — the orchestrator decides which.</p>
      </div>

      <div className="chat-view__messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble chat-bubble--${m.role}`}>
            <div className="chat-bubble__meta">
              <span>{m.role === 'user' ? 'You' : 'Orchestrator'}</span>
              {m.type === 'task' && <Badge tone="action">task</Badge>}
            </div>
            <div className="chat-bubble__content">{m.content}</div>
            {m.events && m.events.length > 0 && <PipelineTrail events={m.events} />}
            {m.type === 'task' && (
              <div className="chat-bubble__actions">
                <button type="button" className="link-button" onClick={() => onNavigate('reasoning')}>
                  View reasoning
                </button>
                <button type="button" className="link-button" onClick={() => onNavigate('report')}>
                  View report
                </button>
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="chat-bubble chat-bubble--assistant chat-bubble--pending">
            <div className="chat-bubble__meta">
              <span>Orchestrator</span>
            </div>
            <div className="chat-bubble__content chat-bubble__content--typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="banner banner--danger">
          {error}
          {missingKey && (
            <>
              {' '}
              <button type="button" className="link-button" onClick={() => onNavigate('settings')}>
                Go to Settings
              </button>
            </>
          )}
        </div>
      )}

      <div className="chat-view__composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message the orchestrator… (Enter to send, Shift+Enter for a new line)"
          rows={2}
          disabled={sending}
        />
        <button type="button" onClick={send} disabled={sending || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
