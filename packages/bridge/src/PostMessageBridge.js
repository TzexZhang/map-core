/**
 * @file PostMessage 通信桥实现
 * @description 基于 window.postMessage API 的跨端通信桥。
 *              适用于 iframe 嵌入、WebView（含 opener）等场景。
 *              通信协议采用 JSON-RPC 2.0 风格。
 * @module MapCore.Bridge.PostMessage
 */
import { Logger } from '@mapcore/core';
/**
 * PostMessage 通信桥
 * @description 通过 window.postMessage 实现跨 iframe / 跨窗口通信。
 *              支持请求/响应配对、超时处理和消息过滤。
 *
 * 使用场景：
 * - 地图嵌入到父页面的 iframe 中
 * - 地图作为弹出窗口与父窗口通信
 * - WebView 中与宿主页面通信
 */
export class PostMessageBridge {
    /**
     * 创建 PostMessage 通信桥
     * @param timeout - 请求超时时间（毫秒），默认 5000
     */
    constructor(timeout = 5000) {
        /** 待响应的请求映射表：消息 ID → Promise 解析器 */
        this.pendingRequests = new Map();
        /** 宿主端消息接收处理器 */
        this.receiveHandler = null;
        /** 消息事件监听器引用（用于销毁时移除） */
        this.messageListener = null;
        this.logger = new Logger('PostMessageBridge');
        this.timeout = timeout;
        this.targetWindow = window.parent !== window ? window.parent : window.opener;
        this.messageListener = this.handleMessage.bind(this);
        window.addEventListener('message', this.messageListener);
    }
    /**
     * 发送消息到宿主端
     * @param method - 方法名
     * @param params - 参数
     * @returns 等待宿主端响应的 Promise
     */
    async send(method, params) {
        const id = this.generateId();
        const message = { id, method, params };
        this.logger.debug('send', `发送消息: ${method} (id: ${id})`);
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
            this.targetWindow.postMessage(message, '*');
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`通信超时: ${method} (id: ${id}, ${this.timeout}ms)`));
                }
            }, this.timeout);
        });
    }
    /**
     * 注册宿主端消息接收处理器
     * @param handler - 消息处理函数
     */
    receive(handler) {
        this.receiveHandler = handler;
    }
    /**
     * 销毁通信桥
     */
    destroy() {
        if (this.messageListener) {
            window.removeEventListener('message', this.messageListener);
            this.messageListener = null;
        }
        for (const [, resolver] of this.pendingRequests) {
            resolver.reject(new Error('通信桥已销毁'));
        }
        this.pendingRequests.clear();
        this.receiveHandler = null;
    }
    /**
     * 处理收到的消息
     */
    handleMessage(event) {
        const data = event.data;
        if (!data?.id)
            return;
        // 响应消息：匹配 pending 请求
        if (this.pendingRequests.has(data.id)) {
            const resolver = this.pendingRequests.get(data.id);
            this.pendingRequests.delete(data.id);
            if (data.error) {
                resolver.reject(new Error(data.error.message));
            }
            else {
                resolver.resolve(data.result);
            }
            return;
        }
        // 主动推送消息：调用 receiveHandler
        if (data.method && this.receiveHandler) {
            this.receiveHandler(data.method, data.params);
        }
    }
    /**
     * 生成唯一消息 ID
     */
    generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
//# sourceMappingURL=PostMessageBridge.js.map