/**
 * @file 图层相关类型定义
 * @description 定义地图图层的类型枚举、各类图层的配置接口、
 *              矢量要素样式配置以及图层运行时状态等类型。
 *              图层是地图上可独立管理的渲染单元，通过 LayerManager 统一管理。
 * @module MapCore.Types.Layer
 */

/**
 * 图层类型枚举
 * @description 定义 SDK 支持的所有图层类型。
 *              不同类型对应不同的数据格式和渲染方式。
 */
export enum LayerType {
  /** 栅格瓦片图层（XYZ / TMS 格式的标准瓦片服务） */
  Tile = 'tile',
  /** OGC WMS 服务图层（Web Map Service） */
  WMS = 'wms',
  /** OGC WMTS 服务图层（Web Map Tile Service） */
  WMTS = 'wmts',
  /** 矢量要素图层（GeoJSON / WFS 格式的矢量数据） */
  Vector = 'vector',
  /** 热力图图层（基于点密度渲染的热力可视化） */
  Heatmap = 'heatmap',
  /** 聚合点图层（大量点要素按距离聚合显示） */
  Cluster = 'cluster',
  /** Cesium 3D Tiles 图层（三维模型瓦片，如建筑、地形） */
  Tileset3D = 'tileset3d',
  CZML = 'czml',
  /** 自定义图层（业务通过插件扩展的特殊图层类型） */
  Custom = 'custom',
}

/**
 * 图层通用基础配置
 * @description 所有图层类型共享的基础配置字段。
 *              每种具体图层类型在此基础上扩展特有配置。
 */
export interface LayerBaseConfig {
  /** 图层唯一标识符，业务方自定义，同一地图实例内不可重复 */
  id: string;
  /** 图层类型（LayerType 枚举值） */
  type: LayerType;
  /** 图层显示名称（可选，供 UI 面板、图例等展示使用） */
  name?: string;
  /** 图层初始可见性，默认 true（可见） */
  visible?: boolean;
  /** 图层透明度，取值范围 0~1，默认 1（完全不透明） */
  opacity?: number;
  /** 图层叠加顺序（z-index），数值越大越靠上层显示，默认按添加顺序 */
  zIndex?: number;
  /** 图层最小可见缩放级别，低于此级别不显示 */
  minZoom?: number;
  /** 图层最大可见缩放级别，高于此级别不显示 */
  maxZoom?: number;
  /**
   * 图层关联的数据源 ID
   * 对应 DataSourceManager 中注册的数据源 ID。
   * 设置后，数据源更新时图层会自动刷新。
   */
  sourceId?: string;
  /**
   * 业务自定义元数据
   * SDK 不做任何处理，原样保存。可用于存储图层描述、创建时间、业务标签等。
   */
  metadata?: Record<string, unknown>;
}

/**
 * 瓦片图层配置（XYZ / TMS 格式）
 * @description 用于配置标准栅格瓦片服务，如 OpenStreetMap、天地图、高德等。
 *              URL 模板支持 {x}、{y}、{z} 占位符。
 */
export interface TileLayerConfig extends LayerBaseConfig {
  /** 图层类型固定为 Tile */
  type: LayerType.Tile;
  /**
   * 瓦片 URL 模板
   * 支持 {x}（列号）、{y}（行号）、{z}（缩放级别）占位符
   * @example 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
   * @example 'http://192.168.1.100/tiles/{z}/{x}/{y}.png'（内网瓦片）
   */
  url: string;
  /** 瓦片尺寸（像素），默认 256 */
  tileSize?: number;
  /** 跨域属性设置，默认 'anonymous' */
  crossOrigin?: string;
}

/**
 * WMS 图层配置（OGC Web Map Service）
 * @description 用于接入标准 OGC WMS 服务，支持 GetMap 请求参数配置。
 */
export interface WMSLayerConfig extends LayerBaseConfig {
  /** 图层类型固定为 WMS */
  type: LayerType.WMS;
  /** WMS 服务基础 URL（不包含查询参数） */
  url: string;
  /** WMS 图层名称，多个图层用逗号分隔 */
  layers: string;
  /** WMS 样式名称，默认 '' */
  styles?: string;
  /** WMS 版本号，默认 '1.3.0' */
  wmsVersion?: string;
  /** 图片格式，默认 'image/png' */
  format?: string;
  /** 是否透明背景，默认 true */
  transparent?: boolean;
}

/**
 * WMTS 图层配置（OGC Web Map Tile Service）
 * @description 用于接入标准 OGC WMTS 瓦片地图服务。
 */
export interface WMTSLayerConfig extends LayerBaseConfig {
  /** 图层类型固定为 WMTS */
  type: LayerType.WMTS;
  /** WMTS 服务 URL */
  url: string;
  /** WMTS 图层名称 */
  layer: string;
  /** 瓦片矩阵集名称 */
  matrixSet: string;
  /** 图片格式，默认 'image/png' */
  format?: string;
  /** 瓦片网格配置（分辨率、矩阵标识等） */
  tileGrid?: {
    /** 原点坐标 [x, y] */
    origin: [number, number];
    /** 各级分辨率数组 */
    resolutions: number[];
    /** 各级矩阵标识 */
    matrixIds: string[];
  };
}

/**
 * 矢量要素样式配置
 * @description 定义矢量要素（点、线、面）的渲染样式。
 *              支持填充色、描边、点样式、图标和文字标注。
 */
export interface VectorStyleConfig {
  /** 填充颜色（CSS 颜色字符串），适用于面要素（Polygon） */
  fillColor?: string;
  /** 描边颜色（CSS 颜色字符串），适用于线和面要素 */
  strokeColor?: string;
  /** 描边宽度（像素），默认 1 */
  strokeWidth?: number;
  /** 点要素半径（像素），默认 6 */
  pointRadius?: number;
  /** 自定义图标 URL（点要素使用图片图标代替默认圆点） */
  iconUrl?: string;
  /** 图标缩放比，默认 1 */
  iconScale?: number;
  /**
   * 文字标注配置
   * 基于要素属性值自动生成文字标注
   */
  label?: {
    /** 要素属性字段名（该字段的值将作为标注文本显示） */
    field: string;
    /** CSS font 字符串，如 '14px sans-serif' */
    font?: string;
    /** 文字颜色，默认 '#000000' */
    color?: string;
    /** Y 轴偏移（像素），正值向下偏移，用于调整标注与要素的相对位置 */
    offsetY?: number;
  };
}

/**
 * 矢量图层配置
 * @description 用于配置矢量要素图层，支持 GeoJSON 格式数据的渲染和交互。
 */
export interface VectorLayerConfig extends LayerBaseConfig {
  /** 图层类型固定为 Vector */
  type: LayerType.Vector;
  /** 矢量要素样式配置 */
  style?: VectorStyleConfig;
  /** 要素是否可点击选中，默认 false */
  selectable?: boolean;
}

/**
 * 热力图图层配置
 * @description 用于配置基于点密度渲染的热力可视化图层。
 */
export interface HeatmapLayerConfig extends LayerBaseConfig {
  /** 图层类型固定为 Heatmap */
  type: LayerType.Heatmap;
  /** 热力权重字段名（要素属性中用于决定热力强度的数值字段） */
  weightField?: string;
  /** 热力半径（像素），默认 8 */
  radius?: number;
  /** 热力模糊度（像素），默认 15 */
  blur?: number;
}

/**
 * 3D Tiles 图层配置（Cesium 专属）
 * @description 用于加载和显示 Cesium 3D Tiles 格式的三维模型数据。
 */
export interface Tileset3DLayerConfig extends LayerBaseConfig {
  /** 图层类型固定为 Tileset3D */
  type: LayerType.Tileset3D;
  /** 3D Tiles 数据集的 URL 地址（tileset.json） */
  url: string;
  /** 模型最大屏幕空间误差（SSE），值越小精度越高但性能开销越大，默认 16 */
  maximumScreenSpaceError?: number;
  /** 模型最大内存使用量（MB），超出后自动卸载低优先级瓦片 */
  maximumMemoryUsage?: number;
}

/**
 * CZML 图层配置（Cesium 专属）
 * @description 用于加载 CZML（Cesium Language）格式的动态时序数据，
 *              常用于轨迹回放、卫星轨道、实时目标追踪等场景。
 */
export interface CZMLLayerConfig extends LayerBaseConfig {
  /** 图层类型固定为 CZML */
  type: LayerType.CZML;
  /** CZML 数据 URL 或直接的 CZML 数据对象 */
  url?: string;
  /** 内联 CZML 数据（与 url 二选一） */
  data?: unknown[];
  /** 是否自动播放动画，默认 true */
  autoPlay?: boolean;
  /** 动画时钟倍速，默认 1 */
  clockMultiplier?: number;
}

/**
 * 自定义图层配置
 * @description 用于插件或业务方注册的自定义图层类型，
 *              通过 LayerManager.registerLayerType() 扩展。
 */
export interface CustomLayerConfig extends LayerBaseConfig {
  /** 图层类型固定为 Custom */
  type: LayerType.Custom;
  /** 自定义渲染器标识（对应注册时的名称） */
  renderer: string;
  /** 自定义配置参数（由具体渲染器定义和消费） */
  customOptions?: Record<string, unknown>;
}

/**
 * 所有图层配置的联合类型
 * @description 根据不同的 LayerType，使用对应的配置接口。
 *              TypeScript 会根据 type 字段自动推导具体的配置类型。
 */
export type LayerConfig =
  | TileLayerConfig
  | VectorLayerConfig
  | WMSLayerConfig
  | WMTSLayerConfig
  | HeatmapLayerConfig
  | Tileset3DLayerConfig
  | CZMLLayerConfig
  | CustomLayerConfig;

/**
 * 图层运行时状态
 * @description 记录图层的实时状态信息，用于调试、监控和状态恢复。
 */
export interface LayerState {
  /** 图层原始配置 */
  config: LayerConfig;
  /** 图层当前可见性 */
  visible: boolean;
  /** 图层当前透明度 */
  opacity: number;
  /** 图层数据加载状态 */
  loadStatus: 'idle' | 'loading' | 'loaded' | 'error';
  /** 最近一次加载错误（仅在 loadStatus 为 error 时有值） */
  error?: Error;
  /** 最近一次数据更新时间戳（毫秒） */
  lastUpdate?: number;
}
