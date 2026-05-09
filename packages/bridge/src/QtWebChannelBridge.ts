/**
 * @file Qt WebChannel 通信桥实现
 * @description 基于 Qt QWebChannel 的跨端通信桥。
 *              适用于 Qt WebEngine 嵌入地图的桌面应用场景。
 * @module MapCore.Bridge.QtWebChannel
 */

import type { IBridge } from '@geomapcore/core';
import { Logger } from '@geomapcore/core';

export class QtWebChannelBridge implements IBridge {
  private logger: Logger;
  private channel: unknown = null;
  private bridgeObject: unknown = null;
  private receiveHandler: ((method: string, params: unknown) => void) | null = null;

  constructor() {
    this.logger = new Logger('QtWebChannelBridge');
  }

  async init(): Promise<void> {
    const qt = (window as unknown as Record<string, unknown>).qt;
    if (!qt || !(qt as Record<string, unknown>).webChannelTransport) {
      throw new Error('Qt WebChannel 环境未检测到');
    }

    try {
      const QWebChannel = (window as unknown as Record<string, unknown>).QWebChannel as new (
        transport: unknown,
        initCallback: (channel: unknown) => void
      ) => void;

      await new Promise<void>((resolve, reject) => {
        new QWebChannel((qt as Record<string, unknown>).webChannelTransport, (ch: unknown) => {
          this.channel = ch;
          const chObj = ch as Record<string, Record<string, unknown>>;
          this.bridgeObject = chObj.objects?.mapBridge;
          if (!this.bridgeObject) {
            reject(new Error('未找到 mapBridge 对象'));
            return;
          }
          resolve();
        });
      });

      this.logger.info('init', 'Qt WebChannel 连接成功');

      const bridge = this.bridgeObject as Record<string, unknown>;
      if (bridge.onMapEvent && typeof bridge.onMapEvent === 'function') {
        // Qt 端已注册回调
      }
    } catch (error) {
      this.logger.error('init', 'Qt WebChannel 连接失败', error);
      throw error;
    }
  }

  async send(method: string, params?: unknown): Promise<unknown> {
    if (!this.bridgeObject) {
      throw new Error('Qt WebChannel 未初始化');
    }

    const bridge = this.bridgeObject as Record<string, (...args: unknown[]) => unknown>;
    if (typeof bridge.sendToMap !== 'function') {
      throw new Error('Qt 端未注册 sendToMap 方法');
    }

    this.logger.debug('send', `发送到 Qt: ${method}`);
    return bridge.sendToMap(JSON.stringify({ method, params }));
  }

  receive(handler: (method: string, params: unknown) => void): void {
    this.receiveHandler = handler;
  }

  destroy(): void {
    if (this.channel) {
      this.channel = null;
    }
    this.bridgeObject = null;
    if (this.receiveHandler) {
      this.receiveHandler = null;
    }
  }
}
