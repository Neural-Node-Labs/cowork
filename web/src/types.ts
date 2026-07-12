export type LogType = 'sys' | 'react' | 'llm';

export type ReasoningKind = 'thought' | 'action' | 'observation' | 'final';

export interface ReasoningEntry {
  timestamp: string;
  agent: string;
  taskId: string | null;
  kind: ReasoningKind;
  content: string;
}

export type SubTaskStatus = 'pending' | 'in-progress' | 'done' | 'failed' | 'blocked';

export interface SubTaskResult {
  status: string;
  summary: string;
  validation_result?: string | null;
}

export interface SubTask {
  'task-id': string;
  task: string;
  command: string;
  validation: string;
  priority: number;
  status: SubTaskStatus;
  'depend-on': string[];
  result?: SubTaskResult;
}

export interface Plan {
  task: string;
  'target-workspace': string;
  'sub-tasks': SubTask[];
}

export interface TokenAgentSummary {
  prompt: number;
  completion: number;
  total: number;
  calls: number;
}

export interface TokenHistoryPoint {
  ts: string;
  agent: string;
  prompt: number;
  completion: number;
  total: number;
  runningTotal: number;
}

export interface TokenSummary {
  prompt: number;
  completion: number;
  total: number;
  byAgent: Record<string, TokenAgentSummary>;
  history: TokenHistoryPoint[];
}

export interface ChatEvent {
  event: string;
  data: Record<string, unknown>;
  ts: string;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  events?: ChatEvent[];
  type?: 'chat' | 'task';
}

export interface ChatResponse {
  type: 'chat' | 'task';
  reply: string;
  events: ChatEvent[];
  plan?: Plan;
  report?: string;
  reportPath?: string;
}

export interface HealthResponse {
  ok: boolean;
  workspace: string;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
}

export interface LogsResponse {
  type: LogType;
  path: string;
  exists: boolean;
  content: string;
}

export interface ReasoningResponse {
  entries: ReasoningEntry[];
}

export interface PlanResponse {
  exists: boolean;
  plan: Plan | null;
}

export interface ReportResponse {
  exists: boolean;
  content: string | null;
  updatedAt?: string;
}

export interface SettingsResponse {
  provider: string;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  limits: {
    plannerMaxSteps: number;
    swarmMaxSteps: number;
    swarmConcurrency: number;
  };
  envPath: string;
}

export interface SettingsUpdate {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  plannerMaxSteps?: number;
  swarmMaxSteps?: number;
  swarmConcurrency?: number;
}
