/**
 * @file 跨端通信桥工厂
 * @description 自动检测宿主环境，返回对应的 Bridge 实现。
 *              支持检测：Qt WebChannel / Android JSBridge / iOS WKWebView / iframe / 纯浏览器。
 * @module MapCore.Bridge.Factory
 */
import type { IBridge } from '@mapcore/core';
/**
 * 宿主环境类型枚举
 */
export declare enum BridgeEnvironment {
    /** Qt WebEngine 桌面应用 */
    QtWebChannel = "qt_webchannel",
    /** Android 原生 WebView */
    Android = "android",
    /** iOS WKWebView */
    IOS = "ios",
    /** iframe / 弹出窗口 */
    PostMessage = "postmessage",
    /** 纯浏览器（无跨端通信） */
    Browser = "browser"
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
export declare class BridgeFactory {
    /** 日志器 */
    private static logger;
    /**
     * 自动检测环境并创建对应的通信桥
     * @returns 通信桥实例
     */
    static detect(): IBridge;
    /**
     * 检测当前宿主环境类型
     * @returns 环境类型枚举值
     */
    static detectEnvironment(): BridgeEnvironment;
}
//# sourceMappingURL=BridgeFactory.d.ts.map