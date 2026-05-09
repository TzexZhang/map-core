/**
 * @file 跨端通信桥工厂
 * @description 自动检测宿主环境，返回对应的 Bridge 实现。
 *              支持检测：Qt WebChannel / Android JSBridge / iOS WKWebView / iframe / 纯浏览器。
 * @module MapCore.Bridge.Factory
 */

import type { IBridge } from '@geomapcore/core';
import { Logger } from '@geomapcore/core';
import { PostMessageBridge } from './PostMessageBridge';
import { QtWebChannelBridge } from './QtWebChannelBridge';
import { AndroidBridge } from './AndroidBridge';
import { IOSBridge } from './IOSBridge';

/**
 * 空桥实现（纯浏览器环境）
 * @description 在非跨端环境中使用，所有操作为空操作。
 */
class NullBridge implements IBridge {
  async send(): Promise<unknown> {
    return undefined;
  }
  receive(): void {
    // 空操作
  }
  destroy(): void {
    // 空操作
  }
}

/**
 * 宿主环境类型枚举
 */
export enum BridgeEnvironment {
  /** Qt WebEngine 桌面应用 */
  QtWebChannel = 'qt_webchannel',
  /** Android 原生 WebView */
  Android = 'android',
  /** iOS WKWebView */
  IOS = 'ios',
  /** iframe / 弹出窗口 */
  PostMessage = 'postmessage',
  /** 纯浏览器（无跨端通信） */
  Browser = 'browser',
}

/**
 * 跨端通信桥工厂
 * @description 自动检测当前运行环境，创建并返回对应的通信桥实例。
 *              业务方无需关心底层通信协议差异。
 *
 * 检测优先级：
 * 1. Qt WebChannel（window.qt.webChannelTransport）
 * 2. Android JSBridge（window.AndroidBridge）
 * 3. iOS WKWebView（window.webkit.messageHandlers.mapBridge）
 * 4. iframe / opener（window.parent !== window）
 * 5. 纯浏览器（NullBridge）
 *
 * @example
 * ```typescript
 * const bridge = BridgeFactory.detect();
 * await bridge.send('sdk.ready', { engine: 'openlayers' });
 * bridge.receive((method, params) => {
 *   console.log('收到宿主端消息:', method, params);
 * });
 * ```
 */
export class BridgeFactory {
  /** 日志器 */
  private static logger = new Logger('BridgeFactory');

  /**
   * 自动检测环境并创建对应的通信桥
   * @returns 通信桥实例
   */
  static detect(): IBridge {
    const env = BridgeFactory.detectEnvironment();
    BridgeFactory.logger.info('detect', `检测到环境: ${env}`);

    switch (env) {
      case BridgeEnvironment.QtWebChannel:
        return new QtWebChannelBridge();
      case BridgeEnvironment.Android:
        return new AndroidBridge();
      case BridgeEnvironment.IOS:
        return new IOSBridge();
      case BridgeEnvironment.PostMessage:
        return new PostMessageBridge();
      case BridgeEnvironment.Browser:
      default:
        return new NullBridge();
    }
  }

  /**
   * 检测当前宿主环境类型
   * @returns 环境类型枚举值
   */
  static detectEnvironment(): BridgeEnvironment {
    const w = window as unknown as Record<string, unknown>;

    // Qt WebChannel
    if (
      typeof w.qt !== 'undefined' &&
      w.qt &&
      (w.qt as Record<string, unknown>).webChannelTransport
    ) {
      return BridgeEnvironment.QtWebChannel;
    }

    // Android JSBridge
    if (typeof w.AndroidBridge !== 'undefined') {
      return BridgeEnvironment.Android;
    }

    // iOS WKWebView
    const webkit = w.webkit as Record<string, Record<string, unknown>> | undefined;
    if (webkit?.messageHandlers && (webkit.messageHandlers as Record<string, unknown>).mapBridge) {
      return BridgeEnvironment.IOS;
    }

    // iframe / opener
    if (window.parent !== window || window.opener) {
      return BridgeEnvironment.PostMessage;
    }

    return BridgeEnvironment.Browser;
  }
}
