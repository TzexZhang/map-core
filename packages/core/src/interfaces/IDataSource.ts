/**
 * @file 数据源接口定义
 * @description 定义数据源的标准接口（IDataSource）和数据源管理器接口（IDataSourceManager）。
 *              数据源负责数据获取，与图层渲染解耦。
 * @module MapCore.Interfaces.IDataSource
 */

import type {
  DataSourceConfig,
  DataSourceType,
  MockSourceConfig,
  DataSourceMiddleware,
  GeoJSONFeatureCollection,
  GeoJSONFeature,
} from '../types';

/**
 * 数据源接口
 * @description 单个数据源的标准操作接口。
 *              所有数据源类型（HTTP / WebSocket / Static / Mock）均实现此接口。
 */
export interface IDataSource {
  /** 数据源唯一标识 ID */
  readonly id: string;
  /** 数据源类型 */
  readonly sourceType: DataSourceType;
  /** 数据源配置 */
  readonly config: DataSourceConfig;

  /**
   * 获取数据（主动拉取）
   * HTTP 数据源：发起一次 HTTP 请求
   * Static/Mock 数据源：直接返回本地数据
   * WebSocket 数据源：返回最近一次收到的数据快照
   *
   * @returns GeoJSON 要素集合数据
   * @throws 网络错误、数据解析错误等
   */
  fetch(): Promise<GeoJSONFeatureCollection>;

  /**
   * 启动数据源（开始轮询或建立 WebSocket 连接）
   * @param onUpdate - 数据更新回调函数
   */
  start(onUpdate: (data: GeoJSONFeatureCollection | GeoJSONFeature[]) => void): void;

  /**
   * 停止数据源（停止轮询或断开 WebSocket 连接）
   */
  stop(): void;

  /**
   * 销毁数据源，释放所有资源
   * 包括：停止轮询、断开连接、清理定时器等
   */
  destroy(): void;
}

/**
 * 数据源管理器接口
 * @description 提供数据源的注册、注销、获取、中间件管理以及 Mock 注入等能力。
 */
export interface IDataSourceManager {
  /**
   * 注册数据源
   * 根据 config.type 自动创建对应的数据源实例。
   *
   * @param config - 数据源配置
   */
  register(config: DataSourceConfig): void;

  /**
   * 注销数据源（同时停止轮询/断开连接）
   * @param sourceId - 数据源 ID
   */
  unregister(sourceId: string): void;

  /**
   * 手动触发一次数据拉取
   * @param sourceId - 数据源 ID
   * @returns 拉取到的数据
   */
  fetch(sourceId: string): Promise<GeoJSONFeatureCollection>;

  /**
   * 启动指定数据源（开始轮询或建立连接）
   * @param sourceId - 数据源 ID
   */
  start(sourceId: string): void;

  /**
   * 停止指定数据源
   * @param sourceId - 数据源 ID
   */
  stop(sourceId: string): void;

  /**
   * 热更新数据源配置（无需重启地图）
   * 场景：联调时切换环境地址、更换 Token 等。
   *
   * @param sourceId - 数据源 ID
   * @param config - 需要更新的配置项（部分更新）
   */
  updateSource(sourceId: string, config: Partial<DataSourceConfig>): void;

  /**
   * 注入 Mock 数据源覆盖真实数据源（仅调试用）
   * 注入后，对该 sourceId 的所有请求都会走 Mock 数据源。
   *
   * @param sourceId - 被覆盖的真实数据源 ID
   * @param mockConfig - Mock 配置
   */
  injectMock(sourceId: string, mockConfig: MockSourceConfig): void;

  /**
   * 移除 Mock 覆盖，恢复真实数据源
   * @param sourceId - 数据源 ID
   */
  removeMock(sourceId: string): void;

  /**
   * 添加请求中间件
   * 中间件按注册顺序依次执行。
   *
   * @param middleware - 中间件实例
   */
  addMiddleware(middleware: DataSourceMiddleware): void;

  /**
   * 移除指定名称的中间件
   * @param name - 中间件名称
   */
  removeMiddleware(name: string): void;

  /**
   * 获取已注册的数据源 ID 列表
   * @returns 数据源 ID 数组
   */
  getSourceIds(): string[];

  /**
   * 检查数据源是否已注册
   * @param sourceId - 数据源 ID
   * @returns 是否存在
   */
  has(sourceId: string): boolean;

  /**
   * 销毁数据源管理器，注销所有数据源
   */
  destroy(): void;
}
