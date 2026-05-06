/**
 * @file 统一错误类定义
 * @description 定义 SDK 中使用的结构化错误类型。
 *              所有 SDK 抛出的错误都使用这些类型，便于调用方区分和处理不同类型的错误。
 *              错误分类：初始化错误、引擎错误、图层错误、数据源错误、插件错误、校验错误。
 * @module MapCore.Errors
 */
/**
 * SDK 错误码枚举
 * @description 每种错误类型对应唯一的错误码，便于日志分析和错误追踪。
 *              错误码格式：E + 四位数字。
 */
export declare enum MapErrorCode {
  /** 初始化失败：容器无效 */
  E1001_INVALID_CONTAINER = 'E1001',
  /** 初始化失败：引擎创建失败 */
  E1002_ENGINE_INIT_FAILED = 'E1002',
  /** 初始化失败：配置无效 */
  E1003_INVALID_CONFIG = 'E1003',
  /** 引擎操作错误：方法调用时引擎未初始化 */
  E2001_ENGINE_NOT_READY = 'E2001',
  /** 引擎操作错误：引擎已销毁 */
  E2002_ENGINE_DESTROYED = 'E2002',
  /** 引擎操作错误：不支持的图层类型 */
  E2003_UNSUPPORTED_LAYER_TYPE = 'E2003',
  /** 图层错误：图层 ID 已存在 */
  E3001_LAYER_DUPLICATE_ID = 'E3001',
  /** 图层错误：图层 ID 不存在 */
  E3002_LAYER_NOT_FOUND = 'E3002',
  /** 图层错误：图层加载失败 */
  E3003_LAYER_LOAD_FAILED = 'E3003',
  /** 数据源错误：数据源 ID 已存在 */
  E4001_SOURCE_DUPLICATE_ID = 'E4001',
  /** 数据源错误：数据源 ID 不存在 */
  E4002_SOURCE_NOT_FOUND = 'E4002',
  /** 数据源错误：数据请求失败 */
  E4003_SOURCE_FETCH_FAILED = 'E4003',
  /** 数据源错误：数据解析失败 */
  E4004_SOURCE_PARSE_FAILED = 'E4004',
  /** 数据源错误：WebSocket 连接失败 */
  E4005_SOURCE_WS_CONNECT_FAILED = 'E4005',
  /** 插件错误：插件名重复 */
  E5001_PLUGIN_DUPLICATE_NAME = 'E5001',
  /** 插件错误：依赖插件未安装 */
  E5002_PLUGIN_DEPENDENCY_MISSING = 'E5002',
  /** 插件错误：插件安装失败 */
  E5003_PLUGIN_INSTALL_FAILED = 'E5003',
  /** 参数校验错误 */
  E6001_VALIDATION_ERROR = 'E6001',
}
/**
 * 地图 SDK 统一错误类
 * @description 所有 SDK 内部抛出的错误都使用此类。
 *              包含错误码、错误模块、原始错误等结构化信息。
 *              调用方可根据 errorCode 进行精确的错误处理。
 *
 * @example
 * ```typescript
 * try {
 *   await map.addLayer(config);
 * } catch (err) {
 *   if (err instanceof MapError && err.errorCode === MapErrorCode.E3001_LAYER_DUPLICATE_ID) {
 *     console.warn('图层已存在:', err.message);
 *   }
 * }
 * ```
 */
export declare class MapError extends Error {
  /** 错误码（来自 MapErrorCode 枚举） */
  readonly errorCode: MapErrorCode;
  /** 错误发生的模块名称 */
  readonly module: string;
  /** 原始错误（如果是包装其他错误的话） */
  readonly cause?: Error;
  /** 错误发生时间戳 */
  readonly timestamp: number;
  /**
   * 创建 MapError 实例
   *
   * @param message - 人类可读的错误描述
   * @param errorCode - 结构化错误码
   * @param module - 错误发生的模块名
   * @param cause - 原始错误（可选）
   */
  constructor(message: string, errorCode: MapErrorCode, module?: string, cause?: Error);
  /**
   * 生成结构化错误信息（用于日志记录）
   * @returns 包含所有错误信息的 JSON 对象
   */
  toJSON(): Record<string, unknown>;
  /**
   * 创建初始化错误
   * @param message - 错误消息
   * @param cause - 原始错误
   * @returns MapError 实例
   */
  static initFailed(message: string, cause?: Error): MapError;
  /**
   * 创建引擎未就绪错误
   * @param method - 调用的方法名
   * @returns MapError 实例
   */
  static engineNotReady(method: string): MapError;
  /**
   * 创建图层未找到错误
   * @param layerId - 图层 ID
   * @returns MapError 实例
   */
  static layerNotFound(layerId: string): MapError;
  /**
   * 创建数据源未找到错误
   * @param sourceId - 数据源 ID
   * @returns MapError 实例
   */
  static sourceNotFound(sourceId: string): MapError;
  /**
   * 创建数据请求失败错误
   * @param sourceId - 数据源 ID
   * @param cause - 原始错误
   * @returns MapError 实例
   */
  static fetchFailed(sourceId: string, cause?: Error): MapError;
  /**
   * 创建参数校验错误
   * @param message - 校验失败的具体描述
   * @returns MapError 实例
   */
  static validationError(message: string): MapError;
}
//# sourceMappingURL=MapError.d.ts.map
