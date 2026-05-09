/**
 * @file Qt WebChannel 通信桥实现
 * @description 基于 Qt QWebChannel 的跨端通信桥。
 *              适用于 Qt WebEngine 嵌入地图的桌面应用场景。
 * @module MapCore.Bridge.QtWebChannel
 */
import { Logger } from '@mapcore/core';
export class QtWebChannelBridge {
    constructor() {
        this.channel = null;
        this.bridgeObject = null;
        this.receiveHandler = null;
        this.logger = new Logger('QtWebChannelBridge');
    }
    async init() {
        const qt = window.qt;
        if (!qt || !qt.webChannelTransport) {
            throw new Error('Qt WebChannel 环境未检测到');
        }
        try {
            const QWebChannel = window.QWebChannel;
            await new Promise((resolve, reject) => {
                new QWebChannel(qt.webChannelTransport, (ch) => {
                    this.channel = ch;
                    const chObj = ch;
                    this.bridgeObject = chObj.objects?.mapBridge;
                    if (!this.bridgeObject) {
                        reject(new Error('未找到 mapBridge 对象'));
                        return;
                    }
                    resolve();
                });
            });
            this.logger.info('init', 'Qt WebChannel 连接成功');
            const bridge = this.bridgeObject;
            if (bridge.onMapEvent && typeof bridge.onMapEvent === 'function') {
                // Qt 端已注册回调
            }
        }
        catch (error) {
            this.logger.error('init', 'Qt WebChannel 连接失败', error);
            throw error;
        }
    }
    async send(method, params) {
        if (!this.bridgeObject) {
            throw new Error('Qt WebChannel 未初始化');
        }
        const bridge = this.bridgeObject;
        if (typeof bridge.sendToMap !== 'function') {
            throw new Error('Qt 端未注册 sendToMap 方法');
        }
        this.logger.debug('send', `发送到 Qt: ${method}`);
        return bridge.sendToMap(JSON.stringify({ method, params }));
    }
    receive(handler) {
        this.receiveHandler = handler;
    }
    destroy() {
        if (this.channel) {
            this.channel = null;
        }
        this.bridgeObject = null;
        if (this.receiveHandler) {
            this.receiveHandler = null;
        }
    }
}
//# sourceMappingURL=QtWebChannelBridge.js.map