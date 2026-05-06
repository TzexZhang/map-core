/**
 * @file 事件类型定义
 * @description 定义 SDK 中所有事件的名称常量及事件载荷类型。
 *              事件分为四大类：地图交互事件、要素交互事件、图层事件、数据源事件和系统事件。
 *              业务方通过 map.on() 监听，内部通过 EventBus.emit() 触发。
 * @module MapCore.Types.Event
 */
import type { LngLat, PixelCoord, GeoJSONFeature, GeoJSONFeatureCollection } from './map.types';
import type { DataSourceType } from './source.types';
/**
 * 所有事件名称常量对象
 * @description 使用常量对象而非魔法字符串，避免拼写错误，便于重构和搜索。
 *              事件名格式为 "域:动作"，如 "map:click"、"layer:add"。
 */
export declare const MapEvents: {
  /** 地图单击事件，携带点击位置的经纬度和屏幕坐标 */
  readonly MAP_CLICK: 'map:click';
  /** 地图双击事件 */
  readonly MAP_DBLCLICK: 'map:dblclick';
  /** 鼠标/触摸移动事件（高频触发，谨慎监听） */
  readonly MAP_POINTERMOVE: 'map:pointermove';
  /** 地图视图变化完成事件（平移、缩放、旋转后触发） */
  readonly MAP_MOVEEND: 'map:moveend';
  /** 地图视图变化中事件（高频，实时跟踪视图变化） */
  readonly MAP_MOVE: 'map:move';
  /** 地图右键菜单事件 */
  readonly MAP_CONTEXTMENU: 'map:contextmenu';
  /** 要素被点击选中事件 */
  readonly FEATURE_CLICK: 'feature:click';
  /** 鼠标悬停在要素上事件 */
  readonly FEATURE_HOVER: 'feature:hover';
  /** 鼠标离开要素事件 */
  readonly FEATURE_LEAVE: 'feature:leave';
  /** 图层添加完成事件 */
  readonly LAYER_ADD: 'layer:add';
  /** 图层移除完成事件 */
  readonly LAYER_REMOVE: 'layer:remove';
  /** 图层可见性变化事件 */
  readonly LAYER_VISIBILITY_CHANGE: 'layer:visibility';
  /** 图层数据加载完成事件 */
  readonly LAYER_LOAD: 'layer:load';
  /** 图层数据加载失败事件 */
  readonly LAYER_ERROR: 'layer:error';
  /** 数据源数据更新事件 */
  readonly DATASOURCE_UPDATE: 'datasource:update';
  /** WebSocket 连接成功事件 */
  readonly DATASOURCE_CONNECTED: 'datasource:connected';
  /** WebSocket 断开连接事件 */
  readonly DATASOURCE_DISCONNECTED: 'datasource:disconnected';
  /** 数据源请求错误事件 */
  readonly DATASOURCE_ERROR: 'datasource:error';
  /** SDK 初始化完成事件 */
  readonly READY: 'system:ready';
  /** SDK 销毁完成事件 */
  readonly DESTROY: 'system:destroy';
  /** 渲染引擎切换完成事件（2D ↔ 3D） */
  readonly ENGINE_SWITCH: 'system:engine_switch';
};
/**
 * 地图点击事件载荷
 * @description 当用户点击地图时触发，包含点击位置的地理坐标、屏幕坐标和命中要素。
 */
export interface MapClickPayload {
  /** 点击位置的经纬度坐标 [经度, 纬度] */
  lngLat: LngLat;
  /** 点击位置的屏幕像素坐标 [x, y]（相对于地图容器） */
  pixel: PixelCoord;
  /** 点击命中的要素列表（可能有多个要素在同一位置叠加） */
  features: GeoJSONFeature[];
  /** 触发此事件的原始浏览器 MouseEvent 或 TouchEvent */
  originalEvent: MouseEvent | TouchEvent;
}
/**
 * 地图双击事件载荷
 */
export interface MapDblClickPayload {
  /** 双击位置经纬度 */
  lngLat: LngLat;
  /** 双击位置屏幕坐标 */
  pixel: PixelCoord;
  /** 原始浏览器事件 */
  originalEvent: MouseEvent;
}
/**
 * 鼠标/触摸移动事件载荷
 * @description 鼠标或触摸在地图上移动时实时触发（高频事件）。
 */
export interface MapPointerMovePayload {
  /** 当前指针位置经纬度 */
  lngLat: LngLat;
  /** 当前指针位置屏幕坐标 */
  pixel: PixelCoord;
  /** 原始浏览器事件 */
  originalEvent: MouseEvent | TouchEvent;
}
/**
 * 地图视图变化完成事件载荷
 */
export interface MapMoveEndPayload {
  /** 变化后的视图状态 */
  viewState: {
    center: LngLat;
    zoom: number;
    rotation?: number;
    pitch?: number;
    heading?: number;
  };
  /** 当前地图可视范围 */
  bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
}
/**
 * 地图右键菜单事件载荷
 */
export interface MapContextMenuPayload {
  /** 右键位置经纬度 */
  lngLat: LngLat;
  /** 右键位置屏幕坐标 */
  pixel: PixelCoord;
  /** 原始浏览器事件 */
  originalEvent: MouseEvent;
}
/**
 * 要素点击事件载荷
 * @description 当用户点击矢量图层上的某个要素时触发。
 */
export interface FeatureClickPayload {
  /** 被点击的 GeoJSON 要素 */
  feature: GeoJSONFeature;
  /** 要素所属图层 ID */
  layerId: string;
  /** 点击位置经纬度 */
  lngLat: LngLat;
  /** 原始浏览器事件 */
  originalEvent: MouseEvent;
}
/**
 * 要素悬停事件载荷
 */
export interface FeatureHoverPayload {
  /** 悬停的 GeoJSON 要素 */
  feature: GeoJSONFeature;
  /** 要素所属图层 ID */
  layerId: string;
  /** 悬停位置经纬度 */
  lngLat: LngLat;
}
/**
 * 要素离开事件载荷
 */
export interface FeatureLeavePayload {
  /** 之前悬停的要素（可能为 null） */
  feature: GeoJSONFeature | null;
  /** 要素所属图层 ID */
  layerId: string;
}
/**
 * 图层添加事件载荷
 */
export interface LayerAddPayload {
  /** 添加的图层 ID */
  layerId: string;
  /** 图层配置 */
  config: unknown;
}
/**
 * 图层移除事件载荷
 */
export interface LayerRemovePayload {
  /** 被移除的图层 ID */
  layerId: string;
}
/**
 * 图层可见性变化事件载荷
 */
export interface LayerVisibilityPayload {
  /** 图层 ID */
  layerId: string;
  /** 新的可见状态 */
  visible: boolean;
}
/**
 * 图层数据加载完成事件载荷
 */
export interface LayerLoadPayload {
  /** 图层 ID */
  layerId: string;
  /** 加载完成时间戳 */
  timestamp: number;
}
/**
 * 图层数据加载失败事件载荷
 */
export interface LayerErrorPayload {
  /** 图层 ID */
  layerId: string;
  /** 错误信息 */
  error: Error;
}
/**
 * 数据源更新事件载荷
 * @description 当数据源获取到新数据时触发，业务方可据此更新 UI 或执行其他操作。
 */
export interface DataSourceUpdatePayload {
  /** 数据源 ID */
  sourceId: string;
  /** 更新的数据（GeoJSON FeatureCollection 或 Feature 数组） */
  data: GeoJSONFeatureCollection | GeoJSONFeature[];
  /** 更新时间戳（毫秒） */
  timestamp: number;
  /** 数据来源类型 */
  sourceType: DataSourceType;
}
/**
 * 数据源连接状态事件载荷
 */
export interface DataSourceConnectionPayload {
  /** 数据源 ID */
  sourceId: string;
  /** 连接状态变化时间戳 */
  timestamp: number;
}
/**
 * 数据源错误事件载荷
 */
export interface DataSourceErrorPayload {
  /** 数据源 ID */
  sourceId: string;
  /** 错误对象 */
  error: Error;
  /** 错误发生时间戳 */
  timestamp: number;
}
/**
 * 系统就绪事件载荷
 */
export interface SystemReadyPayload {
  /** 初始化完成时间戳 */
  timestamp: number;
  /** 当前引擎类型 */
  engineType: string;
}
/**
 * 系统销毁事件载荷
 */
export interface SystemDestroyPayload {
  /** 销毁完成时间戳 */
  timestamp: number;
}
/**
 * 引擎切换事件载荷
 */
export interface EngineSwitchPayload {
  /** 切换前的引擎类型 */
  fromEngine: string;
  /** 切换后的引擎类型 */
  toEngine: string;
  /** 切换完成时间戳 */
  timestamp: number;
}
/**
 * 事件处理器类型
 * @description 通用的事件处理函数签名，支持同步和异步处理。
 */
export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;
//# sourceMappingURL=event.types.d.ts.map
