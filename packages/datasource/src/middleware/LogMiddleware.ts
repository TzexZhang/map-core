/**
 * @file 日志中间件
 * @description 在数据请求前后记录日志，便于调试和问题排查。
 *              记录请求 URL、耗时、响应状态等信息。
 * @module MapCore.DataSource.Middleware.Log
 */

import type { DataSourceMiddleware, DataSourceConfig } from '@geomapcore/core';
import { Logger } from '@geomapcore/core';

/**
 * 日志中间件
 * @description 在每次数据请求前后自动记录日志信息。
 *              - 请求前：记录请求 URL 和方法
 *              - 响应后：记录耗时和数据量
 *              - 错误时：记录错误详情
 *
 * @example
 * ```typescript
 * const log = new LogMiddleware();
 * dataSourceManager.addMiddleware(log);
 * ```
 */
export class LogMiddleware implements DataSourceMiddleware {
  /** 中间件名称 */
  readonly name = 'log';

  /** 日志器 */
  private logger: Logger;

  /** 请求开始时间戳记录 */
  private startTimes: Map<string, number> = new Map();

  /**
   * 创建日志中间件
   */
  constructor() {
    this.logger = new Logger('DataSource');
  }

  /**
   * 请求前处理：记录请求开始时间
   */
  async beforeRequest(config: DataSourceConfig): Promise<DataSourceConfig> {
    const id = (config as { id: string }).id;
    this.startTimes.set(id, Date.now());

    if (config.type === 'http') {
      const httpConfig = config as { url: string; method?: string };
      this.logger.info(id, `请求开始: ${httpConfig.method ?? 'GET'} ${httpConfig.url}`);
    }

    return config;
  }

  /**
   * 响应后处理：记录请求耗时和数据量
   */
  async afterResponse(data: unknown, config: DataSourceConfig): Promise<unknown> {
    const id = (config as { id: string }).id;
    const startTime = this.startTimes.get(id);
    const duration = startTime ? Date.now() - startTime : -1;

    let featureCount = 0;
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.features)) {
        featureCount = obj.features.length;
      }
    }

    this.logger.info(id, `请求完成: 耗时 ${duration}ms, ${featureCount} 个要素`);

    this.startTimes.delete(id);
    return data;
  }

  /**
   * 错误处理：记录错误信息
   */
  async onError(error: Error, config: DataSourceConfig): Promise<unknown> {
    const id = (config as { id: string }).id;
    const startTime = this.startTimes.get(id);
    const duration = startTime ? Date.now() - startTime : -1;

    this.logger.error(id, `请求失败: 耗时 ${duration}ms, 错误: ${error.message}`);

    this.startTimes.delete(id);
    throw error;
  }
}
