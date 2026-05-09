/**
 * @file @mapcore/sdk 包统一导出入口
 * @description MapCore SDK 聚合包，对外暴露所有公共 API。
 *
 * 架构边界说明：
 * - 外部可见：MapController、类型、枚举、错误类、工具函数
 * - 外部不可见：内部引擎适配器、数据源实现、中间件、WebSocket 封装
 * - 内部 HTTP/WebSocket 仅供 SDK 自身使用，不暴露给外部
 * - 外部数据交互通过 ICustomDataSource 接口或 updateLayerData() 方法
 *
 * @module @mapcore/sdk
 */

// ==================== 核心 SDK 类 ====================
export { MapController } from './MapController';

// ==================== 核心枚举 ====================
export { EngineType, LayerType, MapEvents, EventBus, EventTypes } from '@mapcore/core';

// ==================== 核心类型导出（外部 API 用到的） ====================
export type {
  LngLat,
  LngLatAlt,
  PixelCoord,
  BoundingBox,
  ViewState,
  FlyToOptions,
  QueryOptions,
  DebugConfig,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  MapCoreOptions,
  BasemapConfig,
  CoordinateSystem,
  IPlugin,
  PluginContext,
  ICustomDataSource,
  LayerConfig,
  LayerState,
  TileLayerConfig,
  VectorLayerConfig,
  VectorStyleConfig,
  WMSLayerConfig,
  WMTSLayerConfig,
  HeatmapLayerConfig,
  Tileset3DLayerConfig,
  CZMLLayerConfig,
  CustomLayerConfig,
  MapClickPayload,
  MapMoveEndPayload,
  FeatureClickPayload,
  DataSourceUpdatePayload,
  EventHandler,
} from '@mapcore/core';

// ==================== 错误类 ====================
export { MapError, MapErrorCode } from '@mapcore/core';

// ==================== 工具函数 ====================
export {
  Logger,
  LogLevel,
  isValidLngLat,
  distance,
  bearing,
  parseColor,
  withAlpha,
} from '@mapcore/core';

// ==================== 跨端通信桥（外部可选使用） ====================
export { BridgeFactory, BridgeEnvironment } from '@mapcore/bridge';
