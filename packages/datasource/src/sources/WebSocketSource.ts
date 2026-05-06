/**
 * @file WebSocket 数据源实现
 * @description 基于 WebSocket API 的长连接数据源，支持自动重连、
 *              心跳保活、消息解析和断线补偿。
 *
 * 消息协议：
 *   - 不限定消息格式，通过 config.parser 自定义解析
 *   - SDK 不预设任何业务协议，保证通用性
 *
 * 内网适配：
 *   - 支持 ws:// 和 wss://（内网自签证书场景）
 *   - 重连策略：指数退避，避免瞬间大量重连冲击服务端
 *
 * @module MapCore.DataSource.WebSocketSource
 */

import type {
  WebSocketSourceConfig,
  GeoJSONFeatureCollection,
  GeoJSONFeature,
} from '@mapcore/core';
import { DataSourceType, Logger } from '@mapcore/core';

/**
 * WebSocket 数据源
 * @description 实现基于 WebSocket 的实时数据流获取能力。
 *
 * 核心能力：
 * 1. 自动连接和重连（指数退避策略）
 * 2. 心跳保活（定期发送心跳消息防止连接超时断开）
 * 3. 消息解析（通过自定义 parser 将原始消息转为 GeoJSON）
 * 4. 连接状态管理（连接中/已连接/已断开）
 */
export class WebSocketSource {
  /** WebSocket 配置 */
  private config: WebSocketSourceConfig;

  /** WebSocket 实例 */
  private ws: WebSocket | null = null;

  /** 当前重连次数 */
  private reconnectCount: number = 0;

  /** 心跳定时器 */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /** 重连定时器 */
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** 日志器 */
  private logger: Logger;

  /** 数据更新回调 */
  private onUpdate: ((data: GeoJSONFeature[] | GeoJSONFeatureCollection) => void) | null = null;

  /** 连接状态 */
  private connected: boolean = false;

  /** 是否已手动断开（不再自动重连） */
  private manualClose: boolean = false;

  /**
   * 创建 WebSocket 数据源
   * @param config - WebSocket 配置
   */
  constructor(config: WebSocketSourceConfig) {
    this.config = config;
    this.logger = new Logger('WebSocketSource');
  }

  /** 数据源 ID */
  get id(): string {
    return this.config.id;
  }

  /** 数据源类型 */
  get sourceType(): DataSourceType {
    return DataSourceType.WebSocket;
  }

  /** 是否已连接 */
  get isConnected(): boolean {
    return this.connected;
  }

  /**
   * 获取最近一次收到的数据（兼容 IDataSource 接口）
   * @returns 空的 FeatureCollection（WebSocket 为推送模式）
   */
  async fetch(): Promise<GeoJSONFeatureCollection> {
    return { type: 'FeatureCollection', features: [] };
  }

  /**
   * 启动数据源（建立 WebSocket 连接）
   * @param onUpdate - 数据更新回调
   */
  start(onUpdate: (data: GeoJSONFeature[] | GeoJSONFeatureCollection) => void): void {
    this.onUpdate = onUpdate;
    this.manualClose = false;
    this.connect();
  }

  /**
   * 停止数据源（断开 WebSocket 连接）
   */
  stop(): void {
    this.manualClose = true;
    this.disconnect();
  }

  /**
   * 销毁数据源
   */
  destroy(): void {
    this.stop();
    this.onUpdate = null;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<WebSocketSourceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 建立 WebSocket 连接
   * @description 创建 WebSocket 实例，注册 onopen/onmessage/onclose/onerror 事件。
   */
  private connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.logger.debug(this.config.id, `正在连接: ${this.config.url}`);

    try {
      this.ws = new WebSocket(this.config.url);
    } catch (error) {
      this.logger.error(this.config.id, 'WebSocket 创建失败', error);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectCount = 0;
      this.logger.info(this.config.id, '连接成功');

      if (this.config.subscribeMessage) {
        const msg =
          typeof this.config.subscribeMessage === 'string'
            ? this.config.subscribeMessage
            : JSON.stringify(this.config.subscribeMessage);
        this.ws!.send(msg);
      }

      this.startHeartbeat();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data as string);
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.stopHeartbeat();
      this.logger.warn(this.config.id, '连接已断开');

      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.logger.error(this.config.id, '连接错误', error);
    };
  }

  /**
   * 处理收到的消息
   * @param rawMessage - 原始消息字符串
   */
  private handleMessage(rawMessage: string): void {
    if (!this.onUpdate) return;

    if (this.config.parser) {
      try {
        const parsed = this.config.parser(rawMessage);
        if (parsed === null) return;

        if (Array.isArray(parsed)) {
          this.onUpdate(parsed as GeoJSONFeature[]);
        } else {
          this.onUpdate([parsed] as GeoJSONFeature[]);
        }
      } catch (error) {
        this.logger.error(this.config.id, '消息解析失败', error);
      }
    } else {
      try {
        const data = JSON.parse(rawMessage);
        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
          this.onUpdate(data as GeoJSONFeatureCollection);
        } else if (data.type === 'Feature') {
          this.onUpdate([data] as GeoJSONFeature[]);
        }
      } catch {
        this.logger.warn(this.config.id, '无法解析消息（未配置 parser）');
      }
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval ?? 0;
    if (interval <= 0) return;

    const message = this.config.heartbeatMessage ?? '{"type":"ping"}';

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(message);
      }
    }, interval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 调度重连（指数退避）
   */
  private scheduleReconnect(): void {
    const limit = this.config.reconnectLimit ?? 10;
    if (this.reconnectCount >= limit) {
      this.logger.error(this.config.id, `已达到最大重连次数 (${limit})，停止重连`);
      return;
    }

    const baseDelay = 1000;
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectCount), 30000);
    this.reconnectCount++;

    this.logger.info(this.config.id, `将在 ${delay}ms 后进行第 ${this.reconnectCount} 次重连`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 断开连接
   */
  private disconnect(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;

      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.connected = false;
  }
}
