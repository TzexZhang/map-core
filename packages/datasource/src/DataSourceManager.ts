/**
 * @file 数据源管理器实现
 * @description 统一管理所有数据源的注册、注销、数据获取、中间件执行和 Mock 注入。
 *              是 SDK 数据流的核心枢纽，协调数据源与图层之间的数据传递。
 * @module MapCore.DataSource.DataSourceManager
 */

import type {
  DataSourceConfig,
  DataSourceMiddleware,
  MockSourceConfig,
  HttpSourceConfig,
  WebSocketSourceConfig,
  StaticSourceConfig,
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  DataSourceGlobalConfig,
} from '@mapcore/core';
import { DataSourceType, MapError, MapErrorCode, Logger } from '@mapcore/core';
import type { EventBus } from '@mapcore/core';
import { HttpSource } from './sources/HttpSource';
import { WebSocketSource } from './sources/WebSocketSource';
import { StaticSource } from './sources/StaticSource';
import { MockSource } from './sources/MockSource';

/**
 * 数据源实例联合类型
 */
type SourceInstance = HttpSource | WebSocketSource | StaticSource | MockSource;

/**
 * 数据源管理器
 * @description SDK 数据流的核心管理器，职责包括：
 * 1. 根据配置创建和管理各种类型的数据源实例
 * 2. 执行中间件链（鉴权 → 缓存 → 重试 → 日志）
 * 3. 数据更新后通过 EventBus 通知图层刷新
 * 4. 支持 Mock 注入覆盖真实数据源（联调专用）
 * 5. 管理数据源的生命周期（启动/停止/销毁）
 *
 * @example
 * ```typescript
 * const manager = new DataSourceManager(eventBus, globalConfig);
 * manager.register({
 *   type: DataSourceType.HTTP,
 *   id: 'targets',
 *   url: 'http://api.example.com/targets',
 *   pollInterval: 5000,
 * });
 * manager.start('targets');
 * ```
 */
export class DataSourceManager {
  /** 已注册的数据源实例注册表：sourceId → 数据源实例 */
  private sources: Map<string, SourceInstance> = new Map();

  /** Mock 覆盖注册表：被覆盖的 sourceId → Mock 数据源实例 */
  private mockOverrides: Map<string, MockSource> = new Map();

  /** 中间件链（按注册顺序执行） */
  private middlewares: DataSourceMiddleware[] = [];

  /** 事件总线 */
  private eventBus: EventBus;

  /** 全局数据源配置 */
  private globalConfig?: DataSourceGlobalConfig;

  /** 日志器 */
  private logger: Logger;

  /**
   * 创建数据源管理器
   * @param eventBus - 事件总线实例
   * @param globalConfig - 全局数据源配置
   */
  constructor(eventBus: EventBus, globalConfig?: DataSourceGlobalConfig) {
    this.eventBus = eventBus;
    this.globalConfig = globalConfig;
    this.logger = new Logger('DataSourceManager');
  }

  /**
   * 注册数据源
   * @description 根据 config.type 创建对应的数据源实例并存入注册表。
   *
   * @param config - 数据源配置
   * @throws 当 ID 已存在时抛出错误
   */
  register(config: DataSourceConfig): void {
    const id = (config as { id: string }).id;

    if (this.sources.has(id)) {
      throw new MapError(
        `数据源 ID "${id}" 已存在`,
        MapErrorCode.E4001_SOURCE_DUPLICATE_ID,
        'DataSourceManager'
      );
    }

    let source: SourceInstance;

    switch (config.type) {
      case DataSourceType.HTTP:
        source = new HttpSource(config as HttpSourceConfig, this.globalConfig);
        break;
      case DataSourceType.WebSocket:
        source = new WebSocketSource(config as WebSocketSourceConfig);
        break;
      case DataSourceType.Static:
        source = new StaticSource(config as StaticSourceConfig);
        break;
      case DataSourceType.Mock:
        source = new MockSource(config as MockSourceConfig);
        break;
      default:
        throw new MapError(
          `不支持的数据源类型: ${(config as { type: string }).type}`,
          MapErrorCode.E6001_VALIDATION_ERROR,
          'DataSourceManager'
        );
    }

    this.sources.set(id, source);
    this.logger.info(id, `数据源已注册 (${config.type})`);
  }

  /**
   * 注销数据源
   * @param sourceId - 数据源 ID
   */
  unregister(sourceId: string): void {
    const source = this.sources.get(sourceId);
    if (!source) return;

    source.destroy();
    this.sources.delete(sourceId);
    this.mockOverrides.delete(sourceId);
    this.logger.info(sourceId, '数据源已注销');
  }

  /**
   * 手动触发一次数据拉取
   * @param sourceId - 数据源 ID
   * @returns 拉取到的数据
   */
  async fetch(sourceId: string): Promise<GeoJSONFeatureCollection> {
    const source = this.getEffectiveSource(sourceId);

    let config = this.getSourceConfig(sourceId);
    if (config) {
      for (const middleware of this.middlewares) {
        if (middleware.beforeRequest) {
          config = await middleware.beforeRequest(config);
        }
      }
    }

    try {
      let data = await source.fetch();

      for (const middleware of this.middlewares) {
        if (middleware.afterResponse) {
          data = (await middleware.afterResponse(
            data,
            config ?? ({ type: DataSourceType.HTTP, id: sourceId } as DataSourceConfig)
          )) as GeoJSONFeatureCollection;
        }
      }

      this.eventBus.emit('datasource:update', {
        sourceId,
        data,
        timestamp: Date.now(),
        sourceType: source.sourceType,
      });

      return data as GeoJSONFeatureCollection;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      for (const middleware of this.middlewares) {
        if (middleware.onError) {
          try {
            const recovered = await middleware.onError(
              err,
              config ?? ({ type: DataSourceType.HTTP, id: sourceId } as DataSourceConfig)
            );
            if (recovered !== undefined) {
              return recovered as GeoJSONFeatureCollection;
            }
          } catch (_middlewareError) {
            // 中间件也无法恢复，继续抛出原始错误
          }
        }
      }

      this.eventBus.emit('datasource:error', {
        sourceId,
        error: err,
        timestamp: Date.now(),
      });

      throw MapError.fetchFailed(sourceId, err);
    }
  }

  /**
   * 启动数据源
   * @param sourceId - 数据源 ID
   */
  start(sourceId: string): void {
    const source = this.getEffectiveSource(sourceId);
    source.start((data: GeoJSONFeatureCollection | GeoJSONFeature[]) => {
      this.eventBus.emit('datasource:update', {
        sourceId,
        data,
        timestamp: Date.now(),
        sourceType: source.sourceType,
      });
    });

    if (source.sourceType === DataSourceType.WebSocket) {
      this.eventBus.emit('datasource:connected', {
        sourceId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 停止数据源
   * @param sourceId - 数据源 ID
   */
  stop(sourceId: string): void {
    const source = this.getEffectiveSource(sourceId);
    source.stop();
  }

  /**
   * 热更新数据源配置
   * @param sourceId - 数据源 ID
   * @param config - 需要更新的配置项
   */
  updateSource(sourceId: string, config: Partial<DataSourceConfig>): void {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw MapError.sourceNotFound(sourceId);
    }

    if ('updateConfig' in source && typeof source.updateConfig === 'function') {
      source.updateConfig(config as never);
    }

    this.logger.info(sourceId, '数据源配置已更新');
  }

  /**
   * 注入 Mock 数据覆盖真实数据源
   * @param sourceId - 被覆盖的数据源 ID
   * @param mockConfig - Mock 配置
   */
  injectMock(sourceId: string, mockConfig: MockSourceConfig): void {
    const mock = new MockSource(mockConfig);
    this.mockOverrides.set(sourceId, mock);
    this.logger.info(sourceId, '已注入 Mock 数据覆盖');
  }

  /**
   * 移除 Mock 覆盖
   * @param sourceId - 数据源 ID
   */
  removeMock(sourceId: string): void {
    this.mockOverrides.delete(sourceId);
    this.logger.info(sourceId, 'Mock 覆盖已移除');
  }

  /**
   * 添加中间件
   * @param middleware - 中间件实例
   */
  addMiddleware(middleware: DataSourceMiddleware): void {
    this.middlewares.push(middleware);
    this.logger.info('Middleware', `中间件 "${middleware.name}" 已添加`);
  }

  /**
   * 移除中间件
   * @param name - 中间件名称
   */
  removeMiddleware(name: string): void {
    this.middlewares = this.middlewares.filter((m) => m.name !== name);
  }

  /**
   * 获取已注册的数据源 ID 列表
   */
  getSourceIds(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * 检查数据源是否已注册
   */
  has(sourceId: string): boolean {
    return this.sources.has(sourceId);
  }

  /**
   * 销毁数据源管理器
   */
  destroy(): void {
    for (const [id, source] of this.sources) {
      try {
        source.destroy();
      } catch (err) {
        this.logger.error(id, '销毁数据源失败', err);
      }
    }
    this.sources.clear();
    this.mockOverrides.clear();
    this.middlewares = [];
  }

  /**
   * 获取实际生效的数据源（考虑 Mock 覆盖）
   */
  private getEffectiveSource(sourceId: string): SourceInstance {
    const mockSource = this.mockOverrides.get(sourceId);
    if (mockSource) return mockSource;

    const source = this.sources.get(sourceId);
    if (!source) {
      throw MapError.sourceNotFound(sourceId);
    }
    return source;
  }

  /**
   * 获取数据源配置
   */
  private getSourceConfig(sourceId: string): DataSourceConfig | undefined {
    const source = this.sources.get(sourceId);
    if (!source) return undefined;

    if ('config' in source) {
      return (source as unknown as { config: DataSourceConfig }).config;
    }
    return undefined;
  }
}
