/**
 * @file iOS WKWebView 通信桥实现
 * @description 基于 iOS WKWebView messageHandlers 的跨端通信桥。
 *              适用于 iOS 原生应用中嵌入地图 WKWebView 的场景。
 * @module MapCore.Bridge.IOS
 */
import type { IBridge } from '@geomapcore/core';
export declare class IOSBridge implements IBridge {
    private logger;
    private receiveHandler;
    constructor();
    send(method: string, params?: unknown): Promise<unknown>;
    receive(handler: (method: string, params: unknown) => void): void;
    destroy(): void;
}
//# sourceMappingURL=IOSBridge.d.ts.map