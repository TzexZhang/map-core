/**
 * @file 跨端通信桥接口定义
 * @description 定义跨端通信的标准接口（IBridge）和通信消息格式。
 *              支持 Qt WebEngine、Android JSBridge、iOS WKWebView、iframe 等多端通信场景。
 * @module MapCore.Interfaces.IBridge
 */
/**
 * 跨端通信消息格式（JSON-RPC 2.0 风格）
 * @description 所有跨端通信消息遵循此格式，支持请求/响应配对。
 */
export interface BridgeMessage {
  /** 消息唯一 ID（用于请求/响应配对，UUID 格式） */
  id: string;
  /** 调用的方法名，如 'sdk.mapClick'、'sdk.layerUpdate' 等 */
  method: string;
  /** 方法调用参数 */
  params?: unknown;
  /** 响应结果（仅响应消息包含） */
  result?: unknown;
  /** 错误信息（仅错误响应包含） */
  error?: {
    code: number;
    message: string;
  };
}
/**
 * Promise 解析器（用于跨端请求/响应配对）
 * @description 内部使用，维护 pending 状态的请求，等待对端的响应。
 */
export interface PromiseResolver {
  /** 成功回调 */
  resolve: (value: unknown) => void;
  /** 失败回调 */
  reject: (reason: unknown) => void;
}
/**
 * 跨端通信桥接口
 * @description 定义跨端通信的标准方法。
 *              各端（Qt/Android/iOS/iframe）实现此接口，屏蔽底层通信差异。
 */
export interface IBridge {
  /**
   * 向宿主端发送消息（请求/通知）
   *
   * @param method - 调用的方法名
   * @param params - 方法参数
   * @returns Promise，等待宿主端的响应结果
   * @throws 通信超时或宿主端返回错误
   */
  send(method: string, params?: unknown): Promise<unknown>;
  /**
   * 注册宿主端消息接收处理器
   * 当宿主端主动推送消息时调用 handler。
   *
   * @param handler - 消息处理函数，接收方法名和参数
   */
  receive(handler: (method: string, params: unknown) => void): void;
  /**
   * 销毁桥接，清理所有监听器和 pending 请求
   */
  destroy(): void;
}
//# sourceMappingURL=IBridge.d.ts.map
