/**
 * Lightweight typed EventEmitter for browser environments.
 * Replaces Node.js EventEmitter used in Chaterm's InteractionDetector.
 */

type EventHandler = (...args: any[]) => void;

export class TypedEventEmitter<Events extends Record<string, any[]>> {
  private _listeners: Map<string, Set<EventHandler>> = new Map();

  on<K extends string & keyof Events>(event: K, listener: (...args: Events[K]) => void): this {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(listener);
    return this;
  }

  once<K extends string & keyof Events>(event: K, listener: (...args: Events[K]) => void): this {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      listener(...args as any);
    };
    return this.on(event, wrapper);
  }

  off<K extends string & keyof Events>(event: K, listener: (...args: Events[K]) => void): this {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.delete(listener);
      if (handlers.size === 0) {
        this._listeners.delete(event);
      }
    }
    return this;
  }

  emit<K extends string & keyof Events>(event: K, ...args: Events[K]): boolean {
    const handlers = this._listeners.get(event);
    if (!handlers || handlers.size === 0) return false;
    for (const handler of handlers) {
      handler(...args);
    }
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    return this._listeners.get(event)?.size ?? 0;
  }
}
