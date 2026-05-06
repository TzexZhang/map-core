/**
 * @file 统一事件总线实现
 * @description 实现发布/订阅（Pub/Sub）模式的事件总线，用于解耦各模块间通信。
 *              支持：类型安全的事件载荷、一次性监听、通配符监听、优先级排序。
 *              所有地图事件、数据事件、系统事件均通过此总线传递。
 * @module MapCore.Events.EventBus
 */

import type { EventHandler } from '../types';

/**
 * 事件处理器包装结构
 * @description 包含处理器函数及其优先级和是否一次性的元信息。
 */
interface HandlerEntry {
  /** 事件处理函数 */
  handler: EventHandler;
  /** 优先级数值，数值越大越先执行，默认 0 */
  priority: number;
  /** 是否只触发一次，触发后自动移除 */
  once: boolean;
}

/**
 * 统一事件总线
 * @description SDK 内部通信的核心枢纽。各模块通过 EventBus 发布和订阅事件，
 *              实现松耦合的模块间通信。
 *
 * 特性：
 * - 类型安全：通过泛型约束事件载荷类型
 * - 支持一次性监听（once）：触发后自动取消订阅
 * - 支持通配符监听（onAll）：监听所有事件（调试用）
 * - 支持优先级（priority）：高优先级处理器先执行
 * - 异步安全：emit 不阻塞，处理器可以是 async 函数
 *
 * @example
 * ```typescript
 * const bus = new EventBus();
 *
 * // 订阅事件
 * const unsub = bus.on<MapClickPayload>('map:click', (payload) => {
 *   console.log('点击位置:', payload.lngLat);
 * });
 *
 * // 触发事件
 * bus.emit('map:click', { lngLat: [116.4, 39.9], pixel: [100, 200], features: [], originalEvent: null });
 *
 * // 取消订阅
 * unsub();
 * ```
 */
export class EventBus {
  /**
   * 事件处理器注册表
   * key: 事件名称
   * value: 该事件的所有处理器列表
   */
  private handlers: Map<string, HandlerEntry[]> = new Map();

  /**
   * 通配符处理器列表
   * 监听所有事件的处理器，无论事件名称是什么都会触发。
   * 主要用于调试和日志记录。
   */
  private wildcardHandlers: Array<{
    handler: (event: string, payload: unknown) => void;
  }> = [];

  /**
   * 订阅事件
   * @typeparam T - 事件载荷的类型
   * @param event - 事件名称（建议使用 EventTypes 常量）
   * @param handler - 事件处理函数
   * @param priority - 处理器优先级，数值越大越先执行，默认 0
   * @returns 取消订阅函数（调用后移除此监听器）
   */
  on<T = unknown>(
    event: string,
    handler: (payload: T) => void | Promise<void>,
    priority: number = 0
  ): () => void {
    const entry: HandlerEntry = { handler: handler as EventHandler, priority, once: false };
    this.addHandlerEntry(event, entry);

    return () => {
      this.off(event, handler as EventHandler);
    };
  }

  /**
   * 订阅一次性事件
   * 触发一次后自动取消订阅，适用于只需响应一次的场景（如 system:ready）。
   *
   * @typeparam T - 事件载荷的类型
   * @param event - 事件名称
   * @param handler - 事件处理函数（仅触发一次）
   */
  once<T = unknown>(event: string, handler: (payload: T) => void): void {
    const entry: HandlerEntry = { handler: handler as EventHandler, priority: 0, once: true };
    this.addHandlerEntry(event, entry);
  }

  /**
   * 订阅所有事件（通配符模式）
   * 无论什么事件触发，都会调用此处理器。
   * 主要用于调试日志、事件追踪等场景。
   *
   * @param handler - 处理函数，接收事件名和载荷两个参数
   * @returns 取消订阅函数
   */
  onAll(handler: (event: string, payload: unknown) => void): () => void {
    this.wildcardHandlers.push({ handler });

    return () => {
      const idx = this.wildcardHandlers.findIndex((h) => h.handler === handler);
      if (idx !== -1) {
        this.wildcardHandlers.splice(idx, 1);
      }
    };
  }

  /**
   * 触发事件
   * 按优先级顺序调用所有订阅了此事件的处理器。
   * 处理器中的异步错误会被静默捕获，不阻塞其他处理器执行。
   *
   * @typeparam T - 事件载荷的类型
   * @param event - 事件名称
   * @param payload - 事件载荷数据
   */
  emit<T = unknown>(event: string, payload: T): void {
    const entries = this.handlers.get(event);
    if (entries) {
      const toRemove: HandlerEntry[] = [];

      for (const entry of entries) {
        try {
          const result = entry.handler(payload);
          if (result instanceof Promise) {
            result.catch((err: unknown) => {
              console.error(`[EventBus] 异步事件处理器错误 (${event}):`, err);
            });
          }
          if (entry.once) {
            toRemove.push(entry);
          }
        } catch (err) {
          console.error(`[EventBus] 同步事件处理器错误 (${event}):`, err);
        }
      }

      for (const entry of toRemove) {
        const idx = entries.indexOf(entry);
        if (idx !== -1) {
          entries.splice(idx, 1);
        }
      }
    }

    for (const { handler } of this.wildcardHandlers) {
      try {
        handler(event, payload);
      } catch (err) {
        console.error(`[EventBus] 通配符处理器错误 (${event}):`, err);
      }
    }
  }

  /**
   * 取消指定事件的指定处理器订阅
   *
   * @param event - 事件名称
   * @param handler - 要移除的处理器函数引用
   */
  off(event: string, handler: EventHandler): void {
    const entries = this.handlers.get(event);
    if (entries) {
      const idx = entries.findIndex((e) => e.handler === handler);
      if (idx !== -1) {
        entries.splice(idx, 1);
      }
      if (entries.length === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * 清除事件订阅
   * 不传参数时清除所有事件订阅，传入事件名时只清除该事件的订阅。
   *
   * @param event - 可选，指定要清除的事件名称
   */
  clear(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
      this.wildcardHandlers = [];
    }
  }

  /**
   * 获取指定事件的监听器数量（调试用）
   *
   * @param event - 事件名称
   * @returns 监听器数量
   */
  listenerCount(event: string): number {
    return this.handlers.get(event)?.length ?? 0;
  }

  /**
   * 内部方法：添加处理器条目到注册表，并按优先级降序排序
   *
   * @param event - 事件名称
   * @param entry - 处理器条目
   */
  private addHandlerEntry(event: string, entry: HandlerEntry): void {
    let entries = this.handlers.get(event);
    if (!entries) {
      entries = [];
      this.handlers.set(event, entries);
    }
    entries.push(entry);
    entries.sort((a, b) => b.priority - a.priority);
  }
}
