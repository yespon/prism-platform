/**
 * Chat History Manager — localStorage-based chat session persistence.
 * Supports multi-tab sessions, history loading, pagination, and title generation.
 */

export interface ChatSession {
  id: string;
  title: string;
  modelName: string;
  mode: 'cmd' | 'agent';
  assetId?: string;
  assetIp?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** Parts from AI SDK v6 format */
  parts?: any[];
  /** Tool invocations */
  toolInvocations?: any[];
  /** User feedback */
  feedback?: 'up' | 'down';
  timestamp: string;
}

const STORAGE_KEY = 'opsintech_terminal_chats';
const MAX_SESSIONS = 50;
const PAGE_SIZE = 40;

export class ChatHistoryManager {
  /**
   * Load all chat sessions from storage.
   */
  static loadSessions(): ChatSession[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Save a session to storage.
   */
  static saveSession(session: ChatSession): void {
    const sessions = ChatHistoryManager.loadSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    session.updatedAt = new Date().toISOString();

    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.unshift(session);
    }

    // Enforce max sessions limit
    while (sessions.length > MAX_SESSIONS) {
      sessions.pop();
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      console.warn('[ChatHistory] Failed to save session');
    }
  }

  /**
   * Delete a session by ID.
   */
  static deleteSession(sessionId: string): void {
    const sessions = ChatHistoryManager.loadSessions().filter((s) => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }

  /**
   * Load a specific session by ID.
   */
  static loadSession(sessionId: string): ChatSession | null {
    const sessions = ChatHistoryManager.loadSessions();
    return sessions.find((s) => s.id === sessionId) || null;
  }

  /**
   * Get paginated sessions (for history list).
   */
  static getSessionsPage(page: number = 1): ChatSession[] {
    const sessions = ChatHistoryManager.loadSessions();
    const start = (page - 1) * PAGE_SIZE;
    return sessions.slice(start, start + PAGE_SIZE);
  }

  /**
   * Search sessions by title or content.
   */
  static searchSessions(query: string): ChatSession[] {
    const sessions = ChatHistoryManager.loadSessions();
    const lower = query.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.messages.some(
          (m) => m.content && m.content.toLowerCase().includes(lower)
        )
    );
  }

  /**
   * Generate a session ID.
   */
  static generateId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
