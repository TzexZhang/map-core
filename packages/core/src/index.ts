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

// ==================== 类型导出 ====================
export * from './types';

// ==================== 接口导出（供 SDK 内部使用） ====================
export type { IMapEngine } from './interfaces/IMapEngine';
export type { ILayer, ILayerManager } from './interfaces/ILayer';
export type { IBridge, BridgeMessage, PromiseResolver } from './interfaces/IBridge';

// ==================== 事件系统导出 ====================
export { EventBus } from './events/EventBus';
export { EventTypes } from './events/EventTypes';

// ==================== 工具函数导出 ====================
export * from './utils';

// ==================== 错误类导出 ====================
export { MapError, MapErrorCode } from './errors/MapError';

// ==================== 内部模块（不暴露给外部 SDK 用户） ====================
export { DeployConfigManager, deployConfig } from './internal/DeployConfig';
export type { ProxyConfig } from './internal/DeployConfig';
