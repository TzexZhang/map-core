/**
 * @file HTTP/HTTPS 数据源实现
 * @description 基于 fetch API 的 HTTP 数据源，支持单次请求、定时轮询、
 *              请求超时、请求/响应拦截等能力。
 *              不依赖任何第三方 HTTP 库，使用原生 fetch API。
 *
 * 内网适配：
 *   - URL 支持内网地址，无外网校验
 *   - 支持自签名证书场景（通过外部配置传入）
 *
 * @module MapCore.DataSource.HttpSource
 */

import type {
  HttpSourceConfig,
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  DataSourceGlobalConfig,
} from '@mapcore/core';
import { DataSourceType, Logger } from '@mapcore/core';

/**
 * HTTP 数据源
 * @description 实现基于 HTTP/HTTPS 协议的数据获取能力。
 *              支持 GET/POST/PUT 方法、定时轮询、请求超时和自定义拦截器。
 *
 * 核心能力：
 * 1. 单次请求：调用 fetch() 发起 HTTP 请求并返回数据
 * 2. 定时轮询：配置 pollInterval 后自动定时拉取
 * 3. 请求超时：通过 AbortController 实现，超时后自动取消请求
 * 4. 请求/响应拦截：支持全局拦截器修改请求参数和响应数据
 */
export class HttpSource {
  /** 数据源配置 */
  private config: HttpSourceConfig;

  /** 全局数据源配置 */
  private globalConfig?: DataSourceGlobalConfig;

  /** 定时轮询计时器 */
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /** 请求中止控制器 */
  private abortController: AbortController | null = null;

  /** 日志器 */
  private logger: Logger;

  /** 是否正在轮询 */
  private polling: boolean = false;

  /** 数据更新回调 */
  private onUpdate: ((data: GeoJSONFeatureCollection | GeoJSONFeature[]) => void) | null = null;

  /**
   * 创建 HTTP 数据源
   * @param config - HTTP 数据源配置
   * @param globalConfig - 全局数据源配置（可选）
   */
  constructor(config: HttpSourceConfig, globalConfig?: DataSourceGlobalConfig) {
    this.config = config;
    this.globalConfig = globalConfig;
    this.logger = new Logger('HttpSource');
  }

  /** 数据源 ID */
  get id(): string {
    return this.config.id;
  }

  /** 数据源类型 */
  get sourceType(): DataSourceType {
    return DataSourceType.HTTP;
  }

  /**
   * 获取数据（发起一次 HTTP 请求）
   * @description 执行完整的请求流程：
   *              1. 应用请求拦截器
   *              2. 创建 AbortController（支持超时取消）
   *              3. 执行 fetch 请求
   *              4. 解析响应数据
   *              5. 应用响应拦截器
   *              6. 返回标准 GeoJSON FeatureCollection
   *
   * @returns GeoJSON 要素集合数据
   * @throws 网络错误、超时、数据解析失败等
   */
  async fetch(): Promise<GeoJSONFeatureCollection> {
    this.abortController = new AbortController();

    let url = this.config.url;
    let init: RequestInit = {
      method: this.config.method ?? 'GET',
      headers: {
        ...this.globalConfig?.headers,
        ...this.config.headers,
      },
      signal: this.abortController.signal,
    };

    if (this.config.body && (init.method === 'POST' || init.method === 'PUT')) {
      init.body = JSON.stringify(this.config.body);
    }

    if (this.globalConfig?.requestInterceptor) {
      const intercepted = await this.globalConfig.requestInterceptor(url, init);
      url = intercepted.url;
      init = intercepted.init;
    }

    const timeout = this.globalConfig?.timeout ?? 15000;
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, timeout);

    try {
      this.logger.debug(this.config.id, `请求中: ${url}`);

      const response = await fetch(url, init);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP 请求失败: ${response.status} ${response.statusText}`);
      }

      let data: unknown;
      const format = this.config.format ?? 'json';

      switch (format) {
        case 'geojson':
        case 'json':
          data = await response.json();
          break;
        case 'arraybuffer':
          data = await response.arrayBuffer();
          break;
        case 'text':
          data = await response.text();
          break;
      }

      if (this.globalConfig?.responseInterceptor) {
        data = await this.globalConfig.responseInterceptor(response, data);
      }

      const featureCollection = this.normalizeToFeatureCollection(data);

      this.logger.debug(
        this.config.id,
        `请求成功，获取 ${featureCollection.features.length} 个要素`
      );
      return featureCollection;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error(`数据源 "${this.config.id}" 请求超时（${timeout}ms）`);
      }
      throw error;
    }
  }

  /**
   * 启动数据源（开始轮询）
   * @param onUpdate - 数据更新回调函数
   */
  start(onUpdate: (data: GeoJSONFeatureCollection | GeoJSONFeature[]) => void): void {
    this.onUpdate = onUpdate;
    const interval = this.config.pollInterval ?? 0;

    if (interval > 0) {
      this.polling = true;
      this.fetch()
        .then((data) => {
          if (this.onUpdate) this.onUpdate(data);
        })
        .catch((err) => {
          this.logger.error(this.config.id, '轮询首次请求失败', err);
        });

      this.pollTimer = setInterval(async () => {
        if (!this.polling) return;
        try {
          const data = await this.fetch();
          if (this.onUpdate) this.onUpdate(data);
        } catch (err) {
          this.logger.error(this.config.id, '轮询请求失败', err);
        }
      }, interval);
    }
  }

  /**
   * 停止数据源（停止轮询）
   */
  stop(): void {
    this.polling = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.abortController?.abort();
  }

  /**
   * 销毁数据源，释放所有资源
   */
  destroy(): void {
    this.stop();
    this.onUpdate = null;
    this.abortController = null;
  }

  /**
   * 更新配置
   * @param config - 新的配置（部分更新）
   */
  updateConfig(config: Partial<HttpSourceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 将各种格式的响应数据标准化为 GeoJSON FeatureCollection
   * @param data - 原始响应数据
   * @returns 标准 GeoJSON FeatureCollection
   */
  private normalizeToFeatureCollection(data: unknown): GeoJSONFeatureCollection {
    if (!data) {
      return { type: 'FeatureCollection', features: [] };
    }

    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
        return data as GeoJSONFeatureCollection;
      }

      if (obj.type === 'Feature') {
        return { type: 'FeatureCollection', features: [data as GeoJSONFeature] };
      }

      if (Array.isArray(data)) {
        return {
          type: 'FeatureCollection',
          features: data.filter(
            (item) => (item as Record<string, unknown>)?.type === 'Feature'
          ) as GeoJSONFeature[],
        };
      }
    }

    return { type: 'FeatureCollection', features: [] };
  }
}
