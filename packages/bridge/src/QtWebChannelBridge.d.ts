/**
 * @file Qt WebChannel 通信桥实现
 * @description 基于 Qt QWebChannel 的跨端通信桥。
 *              适用于 Qt WebEngine 嵌入地图的桌面应用场景。
 * @module MapCore.Bridge.QtWebChannel
 */
import type { IBridge } from '@mapcore/core';
export declare class QtWebChannelBridge implements IBridge {
    private logger;
    private channel;
    private bridgeObject;
    private receiveHandler;
    constructor();
    init(): Promise<void>;
    send(method: string, params?: unknown): Promise<unknown>;
    receive(handler: (method: string, params: unknown) => void): void;
    destroy(): void;
}
//# sourceMappingURL=QtWebChannelBridge.d.ts.map