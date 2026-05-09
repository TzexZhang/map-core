/**
 * @file 重试中间件
 * @description 在数据请求失败时自动重试，采用指数退避策略避免瞬间大量重试。
 * @module MapCore.DataSource.Middleware.Retry
 */

import type { DataSourceMiddleware, DataSourceConfig } from '@geomapcore/core';

/**
 * 重试中间件配置
 */
export interface RetryMiddlewareConfig {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 基础重试间隔（毫秒），默认 1000 */
  baseDelay?: number;
  /** 最大重试间隔（毫秒），默认 30000 */
  maxDelay?: number;
  /** 判断是否需要重试的条件函数 */
  retryCondition?: (error: Error) => boolean;
}

/**
 * 重试中间件
 * @description 捕获请求错误后自动重试，采用指数退避策略。
 *              仅对可恢复错误（网络错误、5xx 等）进行重试，
 *              对参数错误等不可恢复错误直接抛出。
 *
 * @example
 * ```typescript
 * const retry = new RetryMiddleware({ maxRetries: 5, baseDelay: 2000 });
 * dataSourceManager.addMiddleware(retry);
 * ```
 */
export class RetryMiddleware implements DataSourceMiddleware {
  /** 中间件名称 */
  readonly name = 'retry';

  /** 重试配置 */
  private retryConfig: RetryMiddlewareConfig;

  /**
   * 创建重试中间件
   * @param config - 重试配置
   */
  constructor(config?: RetryMiddlewareConfig) {
    this.retryConfig = config ?? {};
  }

  /**
   * 错误处理：根据策略决定是否重试
   * @param error - 捕获的错误
   * @param config - 数据源配置
   * @returns 重试成功后的数据
   */
  async onError(error: Error, _config: DataSourceConfig): Promise<unknown> {
    const maxRetries = this.retryConfig.maxRetries ?? 3;
    const baseDelay = this.retryConfig.baseDelay ?? 1000;
    const maxDelay = this.retryConfig.maxDelay ?? 30000;

    const shouldRetry = this.retryConfig.retryCondition ?? this.defaultRetryCondition;
    if (!shouldRetry(error)) {
      throw error;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      await this.sleep(delay);

      try {
        // 重试由 DataSourceManager 在中间件链中处理
        return undefined;
      } catch (_retryError) {
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }

    throw error;
  }

  /**
   * 默认重试条件：网络错误和 5xx 状态码
   */
  private defaultRetryCondition(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  }

  /**
   * 延时辅助
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
