/**
 * @file 数据源类型定义
 * @description 定义数据源类型枚举、各数据源的配置接口（HTTP / WebSocket / 静态 / Mock）。
 *              数据源负责数据获取，与图层渲染解耦。
 *              数据源通过 DataSourceManager 统一管理生命周期。
 * @module MapCore.Types.Source
 */
import type { GeoJSONFeature, GeoJSONFeatureCollection } from './map.types';
/**
 * 数据源类型枚举
 * @description 定义 SDK 支持的所有数据获取方式。
 */
export declare enum DataSourceType {
  /** HTTP/HTTPS 单次请求或轮询（最常用的数据获取方式） */
  HTTP = 'http',
  /** WebSocket 长连接实时数据流（适用于实时目标追踪等场景） */
  WebSocket = 'websocket',
  /** 本地静态数据（直接传入 GeoJSON 数据，无需网络请求） */
  Static = 'static',
  /** Mock 模拟数据（仅开发/联调使用，可模拟延迟和错误） */
  Mock = 'mock',
}
/**
 * HTTP 数据源配置
 * @description 用于配置基于 HTTP/HTTPS 协议的数据源。
 *              支持单次请求、定时轮询和请求/响应拦截。
 */
export interface HttpSourceConfig {
  /** 数据源类型固定为 HTTP */
  type: DataSourceType.HTTP;
  /** 数据源唯一标识 ID，在 DataSourceManager 中注册使用 */
  id: string;
  /**
   * 请求 URL
   * 支持模板变量替换：{bbox}（当前视野范围）、{zoom}（当前缩放级别）等
   * @example 'https://api.example.com/features?bbox={bbox}'
   */
  url: string;
  /** HTTP 请求方法，默认 'GET' */
  method?: 'GET' | 'POST' | 'PUT';
  /** 自定义请求头（会覆盖全局 dataSourceConfig 中的同名请求头） */
  headers?: Record<string, string>;
  /** POST/PUT 请求体数据（GET 请求忽略此参数） */
  body?: Record<string, unknown>;
  /**
   * 轮询间隔（毫秒）
   * - 大于 0 时启用定时轮询，每隔指定时间自动拉取最新数据
   * - 等于 0（默认）表示不轮询，仅手动调用 fetch() 时拉取
   */
  pollInterval?: number;
  /**
   * 响应数据格式，默认 'json'
   * - 'geojson'：直接解析为 GeoJSON FeatureCollection
   * - 'json'：解析为通用 JSON 对象
   * - 'arraybuffer'：二进制数据
   * - 'text'：纯文本
   */
  format?: 'geojson' | 'json' | 'arraybuffer' | 'text';
}
/**
 * WebSocket 数据源配置
 * @description 用于配置基于 WebSocket 协议的长连接数据源。
 *              支持自动重连、心跳保活和自定义消息解析。
 */
export interface WebSocketSourceConfig {
  /** 数据源类型固定为 WebSocket */
  type: DataSourceType.WebSocket;
  /** 数据源唯一标识 ID */
  id: string;
  /**
   * WebSocket 服务地址
   * 支持 ws://（非加密）和 wss://（加密）协议
   * @example 'ws://192.168.10.20:9527/map/targets'（内网地址）
   */
  url: string;
  /**
   * 连接成功后发送的订阅消息
   * 用于向服务端声明需要接收的数据类型或范围。
   * 可以是 JSON 字符串或对象（对象会自动序列化）。
   */
  subscribeMessage?: string | Record<string, unknown>;
  /** 心跳发送间隔（毫秒），0 表示不发心跳，默认 30000ms（30秒） */
  heartbeatInterval?: number;
  /** 心跳消息内容，默认 '{"type":"ping"}' */
  heartbeatMessage?: string;
  /** 断线后最大重连次数，默认 10 次。超出后触发 DATASOURCE_ERROR 事件 */
  reconnectLimit?: number;
  /**
   * 自定义消息解析函数
   * 将 WebSocket 收到的原始消息字符串解析为标准 GeoJSON 要素。
   * 返回 null 表示忽略该消息（非目标数据）。
   * @param rawMessage - 原始消息字符串
   * @returns 解析后的 GeoJSON 要素（单个或数组），或 null
   */
  parser?: (rawMessage: string) => GeoJSONFeature | GeoJSONFeature[] | null;
}
/**
 * 静态数据源配置
 * @description 直接传入本地 GeoJSON 数据，无需网络请求。
 *              适用于离线数据、初始化预加载等场景。
 */
export interface StaticSourceConfig {
  /** 数据源类型固定为 Static */
  type: DataSourceType.Static;
  /** 数据源唯一标识 ID */
  id: string;
  /** 静态 GeoJSON 数据（直接传入完整数据） */
  data: GeoJSONFeatureCollection | GeoJSONFeature[];
}
/**
 * Mock 数据源配置（联调/调试专用）
 * @description 模拟数据源，用于后端接口未就绪时的前端开发和联调。
 *              支持模拟网络延迟、随机错误等场景。
 */
export interface MockSourceConfig {
  /** 数据源类型固定为 Mock */
  type: DataSourceType.Mock;
  /** 数据源唯一标识 ID */
  id: string;
  /** 静态 Mock 数据（与 generator 二选一） */
  data?: GeoJSONFeatureCollection | GeoJSONFeature[];
  /**
   * 动态 Mock 数据生成函数
   * 每次请求数据时调用，返回新的模拟数据。
   * 适用于需要动态变化数据的测试场景（如移动目标模拟）。
   */
  generator?: () => GeoJSONFeatureCollection;
  /** 模拟网络延迟（毫秒），默认 0（无延迟） */
  delay?: number;
  /** 模拟请求错误概率，取值 0~1，默认 0（不模拟错误） */
  errorRate?: number;
}
/**
 * 所有数据源配置的联合类型
 * @description 根据 DataSourceType 自动推导对应的配置类型。
 */
export type DataSourceConfig =
  | HttpSourceConfig
  | WebSocketSourceConfig
  | StaticSourceConfig
  | MockSourceConfig;
/**
 * 数据源中间件接口
 * @description 中间件用于在数据请求前后插入通用逻辑（如鉴权、缓存、重试）。
 *              中间件按注册顺序依次执行，形成处理链。
 */
export interface DataSourceMiddleware {
  /** 中间件名称标识 */
  name: string;
  /**
   * 请求前处理
   * @param config - 原始数据源配置
   * @returns 可能修改后的配置
   */
  beforeRequest?: (config: DataSourceConfig) => Promise<DataSourceConfig>;
  /**
   * 响应后处理
   * @param data - 原始响应数据
   * @param config - 对应的数据源配置
   * @returns 处理后的数据
   */
  afterResponse?: (data: unknown, config: DataSourceConfig) => Promise<unknown>;
  /**
   * 错误处理
   * @param error - 捕获的错误
   * @param config - 对应的数据源配置
   * @returns 处理后的数据（恢复成功）或重新抛出错误
   */
  onError?: (error: Error, config: DataSourceConfig) => Promise<unknown>;
}
export interface DataSourceGlobalConfig {
  headers?: Record<string, string>;
  timeout?: number;
  requestInterceptor?: (
    url: string,
    init: RequestInit
  ) => Promise<{
    url: string;
    init: RequestInit;
  }>;
  responseInterceptor?: (response: Response, data: unknown) => Promise<unknown>;
}
//# sourceMappingURL=source.types.d.ts.map
