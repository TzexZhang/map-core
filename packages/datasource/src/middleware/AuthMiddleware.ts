/**
 * @file 鉴权中间件
 * @description 在数据请求中自动注入鉴权 Token 或签名信息。
 *              支持从配置或回调函数获取 Token，每次请求自动附加到请求头。
 * @module MapCore.DataSource.Middleware.Auth
 */

import type { DataSourceMiddleware, DataSourceConfig } from '@geomapcore/core';

/**
 * 鉴权中间件配置
 */
export interface AuthMiddlewareConfig {
  /** Token 获取方式：直接传入 Token 字符串 */
  token?: string;
  /** Token 获取方式：通过回调函数动态获取（支持 Token 刷新） */
  tokenProvider?: () => string | Promise<string>;
  /** Token 放置的请求头字段名，默认 'Authorization' */
  headerName?: string;
  /** Token 前缀，如 'Bearer '，默认 'Bearer ' */
  tokenPrefix?: string;
}

/**
 * 鉴权中间件
 * @description 在每次 HTTP 请求前自动注入鉴权 Token 到请求头。
 *              支持静态 Token 和动态 Token 获取两种模式。
 *
 * @example
 * ```typescript
 * const auth = new AuthMiddleware({
 *   tokenProvider: () => localStorage.getItem('access_token') ?? '',
 *   headerName: 'Authorization',
 *   tokenPrefix: 'Bearer ',
 * });
 * dataSourceManager.addMiddleware(auth);
 * ```
 */
export class AuthMiddleware implements DataSourceMiddleware {
  /** 中间件名称 */
  readonly name = 'auth';

  /** 鉴权配置 */
  private authConfig: AuthMiddlewareConfig;

  /**
   * 创建鉴权中间件
   * @param config - 鉴权配置
   */
  constructor(config: AuthMiddlewareConfig) {
    this.authConfig = config;
  }

  /**
   * 请求前处理：注入鉴权 Token
   * @param config - 原始数据源配置
   * @returns 修改后的配置（添加了鉴权头）
   */
  async beforeRequest(config: DataSourceConfig): Promise<DataSourceConfig> {
    if (config.type !== 'http') return config;

    const httpConfig = { ...config } as unknown as Record<string, unknown>;
    const headers = { ...((httpConfig.headers as Record<string, string>) ?? {}) };

    let token: string;
    if (this.authConfig.tokenProvider) {
      token = await this.authConfig.tokenProvider();
    } else if (this.authConfig.token) {
      token = this.authConfig.token;
    } else {
      return config;
    }

    const headerName = this.authConfig.headerName ?? 'Authorization';
    const prefix = this.authConfig.tokenPrefix ?? 'Bearer ';
    headers[headerName] = `${prefix}${token}`;

    httpConfig.headers = headers;
    return httpConfig as unknown as DataSourceConfig;
  }
}
