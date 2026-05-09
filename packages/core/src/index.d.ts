/**
 * @file @mapcore/core 包统一导出入口
 * @description 核心包是整个 MapCore SDK 的基础，包含：
 *   - 全局类型定义（types/）
 *   - 核心接口定义（interfaces/）
 *   - 事件系统（events/）
 *   - 公共工具函数（utils/）
 *   - 统一错误类（errors/）
 *
 * 此包零外部依赖，可独立使用。
 * @module @mapcore/core
 */
export * from './types';
export type { IMapEngine } from './interfaces/IMapEngine';
export type { ILayer, ILayerManager } from './interfaces/ILayer';
export type { IBridge, BridgeMessage, PromiseResolver } from './interfaces/IBridge';
export { EventBus } from './events/EventBus';
export { EventTypes } from './events/EventTypes';
export * from './utils';
export { MapError, MapErrorCode } from './errors/MapError';
export { DeployConfigManager, deployConfig } from './internal/DeployConfig';
export type { ProxyConfig } from './internal/DeployConfig';
//# sourceMappingURL=index.d.ts.map