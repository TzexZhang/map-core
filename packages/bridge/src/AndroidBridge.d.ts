/**
 * @file Android JSBridge 通信桥实现
 * @description 基于 Android WebView JSBridge 的跨端通信桥。
 *              适用于 Android 原生应用中嵌入地图 WebView 的场景。
 * @module MapCore.Bridge.Android
 */
import type { IBridge } from '@geomapcore/core';
export declare class AndroidBridge implements IBridge {
    private logger;
    private receiveHandler;
    constructor();
    send(method: string, params?: unknown): Promise<unknown>;
    receive(handler: (method: string, params: unknown) => void): void;
    destroy(): void;
}
//# sourceMappingURL=AndroidBridge.d.ts.map