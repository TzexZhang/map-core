/**
 * @file Android JSBridge 通信桥实现
 * @description 基于 Android WebView JSBridge 的跨端通信桥。
 *              适用于 Android 原生应用中嵌入地图 WebView 的场景。
 * @module MapCore.Bridge.Android
 */
import { Logger } from '@mapcore/core';
export class AndroidBridge {
    constructor() {
        this.receiveHandler = null;
        this.logger = new Logger('AndroidBridge');
    }
    async send(method, params) {
        const androidBridge = window.AndroidBridge;
        if (!androidBridge || typeof androidBridge.sendToNative !== 'function') {
            throw new Error('Android JSBridge 未检测到');
        }
        this.logger.debug('send', `发送到 Android: ${method}`);
        const message = JSON.stringify({ method, params });
        const result = androidBridge.sendToNative(message);
        try {
            return typeof result === 'string' ? JSON.parse(result) : result;
        }
        catch {
            return result;
        }
    }
    receive(handler) {
        this.receiveHandler = handler;
        window.__mapcore_android_receive = (messageJson) => {
            try {
                const msg = JSON.parse(messageJson);
                handler(msg.method, msg.params);
            }
            catch (err) {
                this.logger.error('receive', '解析 Android 消息失败', err);
            }
        };
    }
    destroy() {
        if (this.receiveHandler) {
            this.receiveHandler = null;
        }
        delete window.__mapcore_android_receive;
    }
}
//# sourceMappingURL=AndroidBridge.js.map