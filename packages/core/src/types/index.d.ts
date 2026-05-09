/**
 * @file 核心类型统一导出入口
 * @description 将所有类型定义模块统一导出，外部只需从此文件导入即可获取所有类型。
 *              内部类型（如 HttpSourceConfig、WebSocketSourceConfig、DataSourceMiddleware）
 *              不从此处导出，仅供 SDK 内部使用。
 * @module MapCore.Types
 */
export type { LngLat, LngLatAlt, PixelCoord, BoundingBox, ViewState, FlyToOptions, QueryOptions, DebugConfig, GeoJSONFeature, GeoJSONFeatureCollection, MapCoreOptions, BasemapConfig, CoordinateSystem, IPlugin, ICustomDataSource, } from './map.types';
export { EngineType } from './map.types';
export { LayerType } from './layer.types';
export type { LayerBaseConfig, TileLayerConfig, WMSLayerConfig, WMTSLayerConfig, VectorLayerConfig, VectorStyleConfig, HeatmapLayerConfig, Tileset3DLayerConfig, TerrainLayerConfig, CZMLLayerConfig, CustomLayerConfig, LayerConfig, LayerState, } from './layer.types';
export { MapEvents } from './event.types';
export type { MapClickPayload, MapDblClickPayload, MapPointerMovePayload, MapMoveEndPayload, MapContextMenuPayload, FeatureClickPayload, FeatureHoverPayload, FeatureLeavePayload, LayerAddPayload, LayerRemovePayload, LayerVisibilityPayload, LayerLoadPayload, LayerErrorPayload, DataSourceUpdatePayload, DataSourceConnectionPayload, DataSourceErrorPayload, SystemReadyPayload, SystemDestroyPayload, EngineSwitchPayload, EventHandler, } from './event.types';
export { DataSourceType } from './source.types';
export type { DataSourceConfig, HttpSourceConfig, WebSocketSourceConfig, StaticSourceConfig, MockSourceConfig, DataSourceMiddleware, DataSourceGlobalConfig, } from './source.types';
export type { IPlugin as FullIPlugin, PluginContext } from './plugin.types';
//# sourceMappingURL=index.d.ts.map