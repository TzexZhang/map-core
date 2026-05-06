/**
 * @file iOS WKWebView 通信桥实现
 * @description 基于 iOS WKWebView messageHandlers 的跨端通信桥。
 *              适用于 iOS 原生应用中嵌入地图 WKWebView 的场景。
 * @module MapCore.Bridge.IOS
 */

import type { IBridge } from '@mapcore/core';
import { Logger } from '@mapcore/core';

export class IOSBridge implements IBridge {
  private logger: Logger;
  private receiveHandler: ((method: string, params: unknown) => void) | null = null;

  constructor() {
    this.logger = new Logger('IOSBridge');
  }

  async send(method: string, params?: unknown): Promise<unknown> {
    const webkit = (window as unknown as Record<string, unknown>).webkit as
      | Record<string, Record<string, unknown>>
      | undefined;
    const messageHandlers = webkit?.messageHandlers as
      | Record<string, { postMessage: (msg: unknown) => void }>
      | undefined;

    if (!messageHandlers?.mapBridge) {
      throw new Error('iOS WKWebView messageHandler 未检测到');
    }

    this.logger.debug('send', `发送到 iOS: ${method}`);

    const message = JSON.stringify({ method, params });
    messageHandlers.mapBridge.postMessage(message);

    return undefined;
  }

  receive(handler: (method: string, params: unknown) => void): void {
    this.receiveHandler = handler;

    (window as unknown as Record<string, unknown>).__mapcore_ios_receive = (
      messageJson: string
    ) => {
      try {
        const msg = JSON.parse(messageJson) as { method: string; params?: unknown };
        handler(msg.method, msg.params);
      } catch (err) {
        this.logger.error('receive', '解析 iOS 消息失败', err);
      }
    };
  }

  destroy(): void {
    if (this.receiveHandler) {
      this.receiveHandler = null;
    }
    delete (window as unknown as Record<string, unknown>).__mapcore_ios_receive;
  }
}
