/**
 * @file 日志工具
 * @description 提供分级日志功能，支持 DEBUG / INFO / WARN / ERROR 四个级别。
 *              生产环境默认关闭 DEBUG/INFO 级别。仅内部使用，不暴露外部处理器接口。
 * @module MapCore.Utils.Logger
 */
/**
 * 日志级别枚举
 * @description 日志严重性从低到高排列：DEBUG < INFO < WARN < ERROR。
 *              设置某级别后，仅输出该级别及更高级别的日志。
 */
export declare enum LogLevel {
  /** 调试级别，输出详细的调试信息 */
  DEBUG = 0,
  /** 信息级别，输出一般运行信息 */
  INFO = 1,
  /** 警告级别，输出潜在问题提示 */
  WARN = 2,
  /** 错误级别，输出错误和异常信息 */
  ERROR = 3,
  /** 静默模式，不输出任何日志 */
  SILENT = 4,
}
/**
 * 日志工具类
 * @description SDK 内部统一日志管理工具。通过 setLevel() 控制日志输出级别。
 *              每条日志携带模块名和时间戳信息。
 *
 * @example
 * ```typescript
 * const logger = new Logger('MapCore');
 * logger.setLevel(LogLevel.DEBUG);
 * logger.info('LayerManager', '图层已添加', { layerId: 'base-tile' });
 * ```
 */
export declare class Logger {
  /** 当前日志级别，默认 INFO */
  private level;
  /** 日志器名称前缀（用于区分不同实例） */
  private prefix;
  /**
   * 创建日志器实例
   * @param prefix - 日志器名称前缀，通常为模块名
   */
  constructor(prefix?: string);
  /**
   * 设置日志输出级别
   * @param level - 目标日志级别
   */
  setLevel(level: LogLevel): void;
  /**
   * 获取当前日志级别
   * @returns 当前日志级别
   */
  getLevel(): LogLevel;
  /**
   * 输出 DEBUG 级别日志
   * @param module - 模块名称
   * @param message - 日志消息
   * @param data - 附加数据（可选）
   */
  debug(module: string, message: string, data?: unknown): void;
  /**
   * 输出 INFO 级别日志
   * @param module - 模块名称
   * @param message - 日志消息
   * @param data - 附加数据（可选）
   */
  info(module: string, message: string, data?: unknown): void;
  /**
   * 输出 WARN 级别日志
   * @param module - 模块名称
   * @param message - 日志消息
   * @param data - 附加数据（可选）
   */
  warn(module: string, message: string, data?: unknown): void;
  /**
   * 输出 ERROR 级别日志
   * @param module - 模块名称
   * @param message - 日志消息
   * @param error - 错误对象（可选）
   */
  error(module: string, message: string, error?: Error | unknown): void;
  /**
   * 核心日志输出方法
   * @param level - 日志级别
   * @param module - 模块名称
   * @param message - 日志消息
   * @param data - 附加数据
   */
  private log;
}
/**
 * 创建子日志器
 * @param parent - 父日志器实例
 * @param prefix - 子日志器名称前缀
 * @returns 新的 Logger 实例
 */
export declare function createChildLogger(parent: Logger, prefix: string): Logger;
//# sourceMappingURL=logger.d.ts.map
