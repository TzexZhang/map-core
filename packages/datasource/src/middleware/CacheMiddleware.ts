/**
 * @file 缓存中间件
 * @description 为 HTTP 数据请求提供内存缓存能力，避免短时间内重复请求相同数据。
 *              支持自定义缓存有效期（TTL），过期后自动失效。
 * @module MapCore.DataSource.Middleware.Cache
 */

import type { DataSourceMiddleware, DataSourceConfig } from '@mapcore/core';

/**
 * 缓存条目
 */
interface CacheEntry {
  /** 缓存的数据 */
  data: unknown;
  /** 缓存过期时间戳（毫秒） */
  expiresAt: number;
}

/**
 * 缓存中间件配置
 */
export interface CacheMiddlewareConfig {
  /** 缓存有效期（毫秒），默认 60000（1 分钟） */
  ttl?: number;
  /** 最大缓存条目数，默认 100 */
  maxSize?: number;
}

/**
 * 缓存中间件
 * @description 在内存中缓存数据请求结果，减少重复的网络请求。
 *              缓存 key 为 数据源 ID + 请求 URL 的组合。
 *
 * @example
 * ```typescript
 * const cache = new CacheMiddleware({ ttl: 30000, maxSize: 50 });
 * dataSourceManager.addMiddleware(cache);
 * ```
 */
export class CacheMiddleware implements DataSourceMiddleware {
  /** 中间件名称 */
  readonly name = 'cache';

  /** 缓存配置 */
  private cacheConfig: CacheMiddlewareConfig;

  /** 内存缓存存储 */
  private cache: Map<string, CacheEntry> = new Map();

  /**
   * 创建缓存中间件
   * @param config - 缓存配置
   */
  constructor(config?: CacheMiddlewareConfig) {
    this.cacheConfig = config ?? {};
  }

  /**
   * 请求前处理：检查缓存
   * @description 如果缓存命中且未过期，直接返回缓存数据。
   * @param config - 数据源配置
   */
  async beforeRequest(config: DataSourceConfig): Promise<DataSourceConfig> {
    return config;
  }

  /**
   * 响应后处理：写入缓存
   * @param data - 响应数据
   * @param config - 数据源配置
   * @returns 原始数据（或缓存命中时的缓存数据）
   */
  async afterResponse(data: unknown, config: DataSourceConfig): Promise<unknown> {
    const key = this.getCacheKey(config);
    const ttl = this.cacheConfig.ttl ?? 60000;

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });

    this.evictExpired();
    return data;
  }

  /**
   * 获取缓存数据
   * @param config - 数据源配置
   * @returns 缓存数据，未命中或已过期返回 null
   */
  get(config: DataSourceConfig): unknown | null {
    const key = this.getCacheKey(config);
    const entry = this.cache.get(key);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存 key
   */
  private getCacheKey(config: DataSourceConfig): string {
    if (config.type === 'http') {
      const httpConfig = config as { id: string; url: string; method?: string };
      return `${httpConfig.id}:${httpConfig.method ?? 'GET'}:${httpConfig.url}`;
    }
    return (config as { id: string }).id;
  }

  /**
   * 清除过期缓存
   */
  private evictExpired(): void {
    const maxSize = this.cacheConfig.maxSize ?? 100;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    if (this.cache.size > maxSize) {
      const keys = Array.from(this.cache.keys());
      const toDelete = keys.slice(0, this.cache.size - maxSize);
      for (const key of toDelete) {
        this.cache.delete(key);
      }
    }
  }
}
