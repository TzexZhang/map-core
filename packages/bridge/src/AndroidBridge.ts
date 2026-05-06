/**
 * @file Android JSBridge 通信桥实现
 * @description 基于 Android WebView JSBridge 的跨端通信桥。
 *              适用于 Android 原生应用中嵌入地图 WebView 的场景。
 * @module MapCore.Bridge.Android
 */

import type { IBridge } from '@mapcore/core';
import { Logger } from '@mapcore/core';

export class AndroidBridge implements IBridge {
  private logger: Logger;
  private receiveHandler: ((method: string, params: unknown) => void) | null = null;

  constructor() {
    this.logger = new Logger('AndroidBridge');
  }

  async send(method: string, params?: unknown): Promise<unknown> {
    const androidBridge = (window as unknown as Record<string, unknown>).AndroidBridge as
      | Record<string, (...args: unknown[]) => unknown>
      | undefined;

    if (!androidBridge || typeof androidBridge.sendToNative !== 'function') {
      throw new Error('Android JSBridge 未检测到');
    }

    this.logger.debug('send', `发送到 Android: ${method}`);

    const message = JSON.stringify({ method, params });
    const result = androidBridge.sendToNative(message);

    try {
      return typeof result === 'string' ? JSON.parse(result) : result;
    } catch {
      return result;
    }
  }

  receive(handler: (method: string, params: unknown) => void): void {
    this.receiveHandler = handler;

    (window as unknown as Record<string, unknown>).__mapcore_android_receive = (
      messageJson: string
    ) => {
      try {
        const msg = JSON.parse(messageJson) as { method: string; params?: unknown };
        handler(msg.method, msg.params);
      } catch (err) {
        this.logger.error('receive', '解析 Android 消息失败', err);
      }
    };
  }

  destroy(): void {
    if (this.receiveHandler) {
      this.receiveHandler = null;
    }
    delete (window as unknown as Record<string, unknown>).__mapcore_android_receive;
  }
}
