/**
 * @file Mock 模拟数据源实现
 * @description 用于开发/联调阶段的模拟数据源。
 *              支持静态数据、动态生成函数、模拟延迟和随机错误。
 *              仅在开发和测试环境使用，不应在生产环境中启用。
 * @module MapCore.DataSource.MockSource
 */

import type { MockSourceConfig, GeoJSONFeatureCollection, GeoJSONFeature } from '@geomapcore/core';
import { DataSourceType, Logger } from '@geomapcore/core';

/**
 * Mock 数据源
 * @description 模拟真实数据源的行为，用于后端接口未就绪时的前端开发。
 *
 * 核心能力：
 * 1. 静态数据：直接返回预设的 Mock 数据
 * 2. 动态生成：每次请求调用 generator 函数生成新数据
 * 3. 模拟延迟：通过 delay 参数模拟网络延迟
 * 4. 模拟错误：通过 errorRate 参数模拟随机请求失败
 */
export class MockSource {
  /** Mock 数据源配置 */
  private config: MockSourceConfig;

  /** 日志器 */
  private logger: Logger;

  /**
   * 创建 Mock 数据源
   * @param config - Mock 配置
   */
  constructor(config: MockSourceConfig) {
    this.config = config;
    this.logger = new Logger('MockSource');
  }

  /** 数据源 ID */
  get id(): string {
    return this.config.id;
  }

  /** 数据源类型 */
  get sourceType(): DataSourceType {
    return DataSourceType.Mock;
  }

  /**
   * 获取 Mock 数据
   * @description 根据配置模拟网络延迟和随机错误后返回数据。
   *
   * @returns Mock GeoJSON 数据
   * @throws 当随机错误命中时抛出模拟错误
   */
  async fetch(): Promise<GeoJSONFeatureCollection> {
    this.logger.debug(this.config.id, 'Mock 数据请求');

    const delay = this.config.delay ?? 0;
    if (delay > 0) {
      await this.sleep(delay);
    }

    const errorRate = this.config.errorRate ?? 0;
    if (errorRate > 0 && Math.random() < errorRate) {
      this.logger.warn(this.config.id, 'Mock 模拟请求失败');
      throw new Error(`Mock 数据源 "${this.config.id}" 模拟请求失败`);
    }

    if (this.config.generator) {
      return this.config.generator();
    }

    const data = this.config.data;
    if (!data) {
      return { type: 'FeatureCollection', features: [] };
    }

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
   * 启动数据源（Mock 无需特殊启动逻辑）
   */
  start(): void {
    this.logger.info(this.config.id, 'Mock 数据源已启动');
  }

  /**
   * 停止数据源
   */
  stop(): void {
    // Mock 无需停止
  }

  /**
   * 销毁数据源
   */
  destroy(): void {
    // 清空引用
  }

  /**
   * 更新 Mock 配置
   */
  updateConfig(config: Partial<MockSourceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 延时辅助方法
   * @param ms - 延迟毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
