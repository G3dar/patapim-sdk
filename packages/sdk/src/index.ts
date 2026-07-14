/**
 * @patapim/sdk — TypeScript client for the PATAPIM Local API.
 *
 * Zero dependencies: uses global fetch and WebSocket (Node >= 20 / browsers).
 * Create a token in PATAPIM: Preferences → Local API → Create token.
 */

export type Scope =
  | 'terminals:read'
  | 'terminals:write'
  | 'tasks'
  | 'notifications'
  | 'browser'
  | 'files:read'
  | 'files:write'
  | 'events';

export interface PatapimClientOptions {
  /** Scoped token from Preferences → Local API (ppat_...) */
  token: string;
  /** Default: http://127.0.0.1:31415 */
  baseUrl?: string;
}

export interface TerminalInfo {
  terminalId: string;
  name?: string | null;
  customName?: string | null;
  projectPath?: string | null;
  cwd?: string | null;
  aiTool?: string | null;
  isProcessing?: boolean;
  isPlanMode?: boolean;
  needsAttention?: boolean;
  awaitingResponse?: boolean;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  text: string;
  status: 'pending' | 'in_progress' | 'ready_to_test' | 'completed';
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiEvent {
  type: 'event';
  topic: string;
  ts?: string;
  event?: string;
  terminalId?: string;
  data?: string;
  task?: Partial<Task> & { id: string };
  projectPath?: string;
  [key: string]: unknown;
}

export class PatapimApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly requiredScope?: string,
  ) {
    super(message);
    this.name = 'PatapimApiError';
  }
}

export class PatapimClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(options: PatapimClientOptions) {
    if (!options?.token) throw new Error('token is required (create one in PATAPIM → Preferences → Local API)');
    this.token = options.token;
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:31415').replace(/\/+$/, '');
  }

  private async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(this.baseUrl + '/api/v1' + path);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    const res = await fetch(url, {
      method,
      headers: {
        'x-patapim-token': this.token,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new PatapimApiError(
        String(data.error ?? `HTTP ${res.status}`),
        res.status,
        data.code as string | undefined,
        data.requiredScope as string | undefined,
      );
    }
    return data as T;
  }

  /** API + app version, and the scopes this token carries. */
  meta() {
    return this.request<{ appVersion: string; apiVersion: string; scopes: Scope[]; capabilities: string[] }>('GET', '/meta');
  }

  readonly terminals = {
    /** List all terminals with live state. Scope: terminals:read */
    list: () => this.request<{ terminals: TerminalInfo[] }>('GET', '/terminals'),
    /** Get one terminal. Accepts "term-3" or "3". Scope: terminals:read */
    get: (id: string) => this.request<TerminalInfo>('GET', `/terminals/${encodeURIComponent(id)}`),
    /** Read the screen buffer. Scope: terminals:read */
    buffer: (id: string, lastLines?: number) =>
      this.request<{ terminalId: string; buffer: string }>('GET', `/terminals/${encodeURIComponent(id)}/buffer`, undefined, { lastLines }),
    /** Create a terminal (subject to the plan's terminal limit). Scope: terminals:write */
    create: (opts: { cwd?: string; projectPath?: string; shell?: string; cols?: number; rows?: number } = {}) =>
      this.request<TerminalInfo>('POST', '/terminals', opts),
    /**
     * Send input. Tip: to submit a prompt to an AI CLI, end with "\n" or pass
     * pressEnter. Scope: terminals:write
     */
    write: (id: string, data: string, pressEnter = false) =>
      this.request<{ success?: boolean }>('POST', `/terminals/${encodeURIComponent(id)}/write`, { data, pressEnter }),
    /** Resize. Scope: terminals:write */
    resize: (id: string, cols: number, rows: number) =>
      this.request<{ success?: boolean }>('POST', `/terminals/${encodeURIComponent(id)}/resize`, { cols, rows }),
    /** Close a terminal. Scope: terminals:write */
    close: (id: string) => this.request<{ success?: boolean }>('DELETE', `/terminals/${encodeURIComponent(id)}`),
  };

  readonly tasks = {
    /** Scope: tasks */
    list: (projectPath: string) => this.request<{ tasks: Task[] }>('GET', '/tasks', undefined, { projectPath }),
    /** Scope: tasks */
    create: (projectPath: string, text: string) => this.request<{ task: Task }>('POST', '/tasks', { projectPath, text }),
    /** Scope: tasks */
    updateStatus: (projectPath: string, id: string, status: Task['status']) =>
      this.request<{ task: Task }>('PATCH', `/tasks/${encodeURIComponent(id)}`, { projectPath, status }),
    /** Scope: tasks */
    delete: (projectPath: string, id: string) =>
      this.request<{ ok: boolean }>('DELETE', `/tasks/${encodeURIComponent(id)}`, undefined, { projectPath }),
  };

  /** Schedule a one-shot command into a terminal at a future time. Scope: tasks */
  scheduleCommand(opts: { command: string; executeAt: string | Date; targetTerminalId?: string }) {
    return this.request<{ success?: boolean }>('POST', '/scheduled-commands', {
      ...opts,
      executeAt: opts.executeAt instanceof Date ? opts.executeAt.toISOString() : opts.executeAt,
    });
  }

  /** Send a notification through the user's configured channel. Scope: notifications */
  notify(text: string, terminalId?: string) {
    return this.request<{ success?: boolean }>('POST', '/notifications', { text, terminalId });
  }

  readonly browser = {
    /** Scope: browser (all browser methods) */
    navigate: (url: string, terminalId?: string) => this.request('POST', '/browser/navigate', { url, terminalId }),
    screenshot: () => this.request<{ image?: string }>('POST', '/browser/screenshot', {}),
    click: (target: { selector?: string; text?: string }) => this.request('POST', '/browser/click', target),
    fill: (selector: string, value: string) => this.request('POST', '/browser/fill', { selector, value }),
    type: (text: string) => this.request('POST', '/browser/type', { text }),
    pressKey: (key: string) => this.request('POST', '/browser/press-key', { key }),
    scroll: (opts: { dy?: number; selector?: string }) => this.request('POST', '/browser/scroll', opts),
    wait: (opts: { selector?: string; text?: string; timeoutMs?: number }) => this.request('POST', '/browser/wait', opts),
    back: () => this.request('POST', '/browser/back', {}),
    forward: () => this.request('POST', '/browser/forward', {}),
    refresh: () => this.request('POST', '/browser/refresh', {}),
    content: (format?: 'text' | 'html') => this.request<{ content?: string }>('GET', '/browser/content', undefined, { format }),
    info: () => this.request<{ url?: string; title?: string }>('GET', '/browser/info'),
    status: () => this.request('GET', '/browser/status'),
    list: () => this.request('GET', '/browser/list'),
  };

  readonly files = {
    /** Scope: files:read */
    tree: (projectPath: string, depth?: number) => this.request('GET', '/files/tree', undefined, { projectPath, depth }),
    /** Scope: files:read */
    read: (path: string) => this.request<{ content?: string }>('GET', '/files/read', undefined, { path }),
    /** Scope: files:write */
    write: (path: string, content: string) => this.request('POST', '/files/write', { path, content }),
  };

  /**
   * Open the WebSocket event stream and subscribe to topics.
   * Requires the "events" scope plus the matching resource scope per topic:
   *   'terminals'              → terminals:read   (lifecycle: created/closed/renamed)
   *   'terminal-output:<id>'   → terminals:read   (raw PTY output)
   *   'tasks'                  → tasks            (task created/updated/deleted)
   *   'notifications'          → notifications    (terminal needs attention / awaiting response)
   */
  events(topics: string[]): Promise<PatapimEventStream> {
    return PatapimEventStream.connect(this.baseUrl, this.token, topics);
  }
}

type Listener = (event: ApiEvent) => void;

export class PatapimEventStream {
  private listeners = new Map<string, Set<Listener>>();
  private anyListeners = new Set<Listener>();

  private constructor(
    private readonly ws: WebSocket,
    public readonly topics: string[],
    public readonly rejected: Array<{ topic: string; reason: string; requiredScope?: string }>,
  ) {
    ws.addEventListener('message', (e: MessageEvent) => {
      let msg: ApiEvent;
      try { msg = JSON.parse(String(e.data)); } catch { return; }
      if (msg.type !== 'event' || !msg.topic) return;
      for (const l of this.anyListeners) l(msg);
      for (const l of this.listeners.get(msg.topic) ?? []) l(msg);
      // 'terminal-output:*' listeners match any output topic
      if (msg.topic.startsWith('terminal-output:')) {
        for (const l of this.listeners.get('terminal-output:*') ?? []) l(msg);
      }
    });
  }

  static connect(baseUrl: string, token: string, topics: string[]): Promise<PatapimEventStream> {
    const wsUrl = baseUrl.replace(/^http/, 'ws') + `?token=${encodeURIComponent(token)}`;
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const fail = (err: unknown) => reject(err instanceof Error ? err : new Error(String(err)));
      ws.addEventListener('error', fail);
      ws.addEventListener('message', (e: MessageEvent) => {
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(String(e.data)); } catch { return; }
        if (msg.type === 'auth_result') {
          if (!msg.success) return fail(new Error('WebSocket auth failed — does the token have the "events" scope?'));
          ws.send(JSON.stringify({ type: 'subscribe', topics }));
        } else if (msg.type === 'subscribed') {
          resolve(new PatapimEventStream(
            ws,
            (msg.topics as string[]) ?? [],
            (msg.rejected as PatapimEventStream['rejected']) ?? [],
          ));
        }
      });
    });
  }

  /** Listen to a topic ('tasks', 'notifications', 'terminals', 'terminal-output:<id>' or 'terminal-output:*'). */
  on(topic: string, listener: Listener): this {
    if (!this.listeners.has(topic)) this.listeners.set(topic, new Set());
    this.listeners.get(topic)!.add(listener);
    return this;
  }

  /** Listen to every event regardless of topic. */
  onAny(listener: Listener): this {
    this.anyListeners.add(listener);
    return this;
  }

  off(topic: string, listener: Listener): this {
    this.listeners.get(topic)?.delete(listener);
    return this;
  }

  close(): void {
    try { this.ws.close(); } catch { /* already closed */ }
  }
}
