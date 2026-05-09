/**
 * @file iOS WKWebView 通信桥实现
 * @description 基于 iOS WKWebView messageHandlers 的跨端通信桥。
 *              适用于 iOS 原生应用中嵌入地图 WKWebView 的场景。
 * @module MapCore.Bridge.IOS
 */
import { Logger } from '@mapcore/core';
export class IOSBridge {
    constructor() {
        this.receiveHandler = null;
        this.logger = new Logger('IOSBridge');
    }
    async send(method, params) {
        const webkit = window.webkit;
        const messageHandlers = webkit?.messageHandlers;
        if (!messageHandlers?.mapBridge) {
            throw new Error('iOS WKWebView messageHandler 未检测到');
        }
        this.logger.debug('send', `发送到 iOS: ${method}`);
        const message = JSON.stringify({ method, params });
        messageHandlers.mapBridge.postMessage(message);
        return undefined;
    }
    receive(handler) {
        this.receiveHandler = handler;
        window.__mapcore_ios_receive = (messageJson) => {
            try {
                const msg = JSON.parse(messageJson);
                handler(msg.method, msg.params);
            }
            catch (err) {
                this.logger.error('receive', '解析 iOS 消息失败', err);
            }
        };
    }
    destroy() {
        if (this.receiveHandler) {
            this.receiveHandler = null;
        }
        delete window.__mapcore_ios_receive;
    }
}
//# sourceMappingURL=IOSBridge.js.map