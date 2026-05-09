/**
 * @file PostMessage 通信桥实现
 * @description 基于 window.postMessage API 的跨端通信桥。
 *              适用于 iframe 嵌入、WebView（含 opener）等场景。
 *              通信协议采用 JSON-RPC 2.0 风格。
 * @module MapCore.Bridge.PostMessage
 */
import type { IBridge } from '@geomapcore/core';
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
export declare class PostMessageBridge implements IBridge {
    /** 日志器 */
    private logger;
    /** 待响应的请求映射表：消息 ID → Promise 解析器 */
    private pendingRequests;
    /** 宿主端消息接收处理器 */
    private receiveHandler;
    /** 消息事件监听器引用（用于销毁时移除） */
    private messageListener;
    /** 通信目标窗口 */
    private targetWindow;
    /** 请求超时时间（毫秒） */
    private timeout;
    /**
     * 创建 PostMessage 通信桥
     * @param timeout - 请求超时时间（毫秒），默认 5000
     */
    constructor(timeout?: number);
    /**
     * 发送消息到宿主端
     * @param method - 方法名
     * @param params - 参数
     * @returns 等待宿主端响应的 Promise
     */
    send(method: string, params?: unknown): Promise<unknown>;
    /**
     * 注册宿主端消息接收处理器
     * @param handler - 消息处理函数
     */
    receive(handler: (method: string, params: unknown) => void): void;
    /**
     * 销毁通信桥
     */
    destroy(): void;
    /**
     * 处理收到的消息
     */
    private handleMessage;
    /**
     * 生成唯一消息 ID
     */
    private generateId;
}
//# sourceMappingURL=PostMessageBridge.d.ts.map