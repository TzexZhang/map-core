/**
 * @file 本地静态数据源实现
 * @description 直接使用传入的 GeoJSON 数据，无需网络请求。
 *              适用于离线数据、预加载的固定数据等场景。
 * @module MapCore.DataSource.StaticSource
 */

import type { StaticSourceConfig, GeoJSONFeatureCollection, GeoJSONFeature } from '@mapcore/core';
import { DataSourceType } from '@mapcore/core';

/**
 * 静态数据源
 * @description 将本地 GeoJSON 数据封装为标准数据源接口。
 *              fetch() 直接返回传入的数据，无网络开销。
 */
export class StaticSource {
  /** 静态数据源配置 */
  private config: StaticSourceConfig;

  /**
   * 创建静态数据源
   * @param config - 静态数据源配置
   */
  constructor(config: StaticSourceConfig) {
    this.config = config;
  }

  /** 数据源 ID */
  get id(): string {
    return this.config.id;
  }

  /** 数据源类型 */
  get sourceType(): DataSourceType {
    return DataSourceType.Static;
  }

  /**
   * 获取数据（直接返回本地数据）
   * @returns 标准 GeoJSON FeatureCollection
   */
  async fetch(): Promise<GeoJSONFeatureCollection> {
    const data = this.config.data;

    if (Array.isArray(data)) {
      if (
        data.length > 0 &&
        (data[0] as unknown as Record<string, unknown>)?.type === 'FeatureCollection'
      ) {
        return data[0] as unknown as GeoJSONFeatureCollection;
      }
      return {
        type: 'FeatureCollection',
        features: data.filter(
          (item) => (item as unknown as Record<string, unknown>)?.type === 'Feature'
        ) as GeoJSONFeature[],
      };
    }

    return data as GeoJSONFeatureCollection;
  }

  /**
   * 启动数据源（静态数据源无需启动）
   */
  start(): void {
    // 静态数据源无需启动
  }

  /**
   * 停止数据源
   */
  stop(): void {
    // 静态数据源无需停止
  }

  /**
   * 销毁数据源
   */
  destroy(): void {
    // 清空引用
  }

  /**
   * 更新数据
   * @param data - 新的静态数据
   */
  updateData(data: GeoJSONFeatureCollection | GeoJSONFeature[]): void {
    this.config.data = data;
  }
}
