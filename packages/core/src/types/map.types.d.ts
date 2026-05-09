/**
 * @file 地图相关基础类型定义
 * @description 定义地图 SDK 中使用的所有基础地理坐标类型、视图状态、
 *              渲染引擎枚举以及 SDK 初始化主配置等核心类型。
 *              这些类型是整个 SDK 的基础契约，所有模块均依赖此文件。
 * @module MapCore.Types.Map
 */
/**
 * 经纬度坐标类型
 * @description 使用 WGS84（EPSG:4326）坐标系，元组格式为 [经度, 纬度]
 * - 经度范围：-180 ~ 180（西经为负，东经为正）
 * - 纬度范围：-90 ~ 90（南纬为负，北纬为正）
 * - 示例：北京天安门 [116.397428, 39.90923]
 */
export type LngLat = [number, number];
/**
 * 经纬度+高度坐标类型
 * @description 在经纬度基础上增加高度维度（单位：米，海拔高度）
 * - 第三个元素为相对于 WGS84 椭球体的高度
 * - 三维场景（Cesium）中使用较多
 * - 示例：无人机位置 [116.397428, 39.90923, 500] 表示海拔 500 米
 */
export type LngLatAlt = [number, number, number];
/**
 * 屏幕像素坐标类型
 * @description 相对于地图容器左上角的像素偏移量，元组格式为 [x, y]
 * - x：水平方向像素偏移（向右为正）
 * - y：垂直方向像素偏移（向下为正）
 * - 用于地图点击事件中的屏幕坐标、坐标转换等场景
 */
export type PixelCoord = [number, number];
/**
 * 地图视野范围（包围盒）
 * @description 用西南角和东北角两个经纬度点定义一个矩形地理范围
 * - west：西边界经度（最小经度）
 * - south：南边界纬度（最小纬度）
 * - east：东边界经度（最大经度）
 * - north：北边界纬度（最大纬度）
 * - 通常用于表示当前地图可视区域或空间查询范围
 */
export interface BoundingBox {
    /** 西边界经度 */
    west: number;
    /** 南边界纬度 */
    south: number;
    /** 东边界经度 */
    east: number;
    /** 北边界纬度 */
    north: number;
}
/**
 * 地图视图状态
 * @description 描述地图当前的视图参数，包括中心点、缩放级别、旋转角度等。
 *              2D（OpenLayers）和 3D（Cesium）共享此接口，部分字段仅在对应模式下有效。
 */
export interface ViewState {
    /** 当前地图中心点经纬度坐标 [经度, 纬度] */
    center: LngLat;
    /**
     * 当前缩放级别
     * - 2D 模式下：整数或浮点数，通常范围 0~22，值越大越详细
     * - 3D 模式下：可通过相机高度换算得到等效缩放级别
     */
    zoom: number;
    /**
     * 地图旋转角度（弧度制）
     * - 0 表示正北朝上
     * - 正值表示逆时针旋转
     * - 仅 2D 模式（OpenLayers）直接支持
     * - 3D 模式通过 heading 字段实现类似功能
     */
    rotation?: number;
    /**
     * 俯仰角（角度制）
     * - 0 度为正射（正上方俯视）
     * - 90 度为水平视角
     * - 仅 3D 模式（Cesium）有效
     */
    pitch?: number;
    /**
     * 朝向角（角度制）
     * - 0 度为正北
     * - 顺时针增加，90 度为正东
     * - 仅 3D 模式（Cesium）有效
     */
    heading?: number;
}
/**
 * flyTo 动画参数配置
 * @description 用于控制地图飞行（平滑过渡）到目标位置的动画效果。
 *              支持自定义动画时长、缓动函数以及 3D 特有的相机角度参数。
 */
export interface FlyToOptions {
    /** 目标中心点坐标，支持二维 [经度, 纬度] 或三维 [经度, 纬度, 高度] */
    center: LngLat | LngLatAlt;
    /** 目标缩放级别（2D 模式下生效） */
    zoom?: number;
    /** 动画持续时间（毫秒），默认 1000ms */
    duration?: number;
    /** 目标俯仰角（度），仅 3D 模式生效 */
    pitch?: number;
    /** 目标朝向角（度），仅 3D 模式生效 */
    heading?: number;
    /**
     * 自定义缓动函数
     * @param t - 归一化时间参数，范围 0~1
     * @returns 归一化进度值，范围 0~1
     * @example
     * // 线性缓动
     * (t) => t
     * // 缓入缓出
     * (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
     */
    easing?: (t: number) => number;
}
/**
 * 坐标系类型
 * @description 控制 SDK 外部接口使用的坐标系。
 *              SDK 内部始终使用 WGS84（EPSG:4326）作为标准，
 *              外部调用方可根据需要选择传入/接收的坐标格式。
 *
 * - `'EPSG:4326'`（默认）：WGS84 经纬度 [经度, 纬度]，单位：度
 * - `'EPSG:3857'`：Web Mercator 投影 [x, y]，单位：米
 */
export type CoordinateSystem = 'EPSG:4326' | 'EPSG:3857';
/**
 * 渲染引擎类型枚举
 * @description 定义 SDK 支持的地图渲染引擎类型。
 *              选择不同引擎决定了地图的显示模式（2D 平面 / 3D 球体）。
 */
export declare enum EngineType {
    /** OpenLayers 二维平面地图引擎，适合传统 GIS 应用 */
    OpenLayers = "openlayers",
    /** Cesium 三维地球引擎，适合三维场景、地形、3D Tiles 等应用 */
    Cesium = "cesium"
}
/**
 * 要素查询选项
 * @description 用于 queryFeaturesByPixel 方法，控制要素查询的精度和范围
 */
export interface QueryOptions {
    /** 命中容差（像素），点击位置多大范围内视为命中，默认 5 */
    hitTolerance?: number;
    /** 限定查询的图层 ID 列表，不传则查询所有可见图层 */
    layerIds?: string[];
}
/**
 * 调试配置
 * @description 控制 SDK 的调试行为，仅在开发/测试环境启用
 */
export interface DebugConfig {
    /** 是否启用调试模式，默认 false */
    enabled?: boolean;
    /** 日志级别：'DEBUG' | 'INFO' | 'WARN' | 'ERROR'，默认 'WARN' */
    logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    /** 是否记录所有事件到控制台 */
    logAllEvents?: boolean;
}
/**
 * GeoJSON 要素接口
 * @description 遵循 GeoJSON RFC 7946 规范的 Feature 对象定义。
 *              SDK 内部统一使用此格式传递地理要素数据。
 */
export interface GeoJSONFeature {
    /** 固定为 "Feature" */
    type: 'Feature';
    /** 几何信息，可为 null（无几何的属性要素） */
    geometry: {
        /** 几何类型：Point / MultiPoint / LineString / MultiLineString / Polygon / MultiPolygon / GeometryCollection */
        type: string;
        /** 几何坐标数据，结构取决于 geometry.type */
        coordinates: unknown;
    } | null;
    /** 要素属性字典，业务自定义数据 */
    properties?: Record<string, unknown> | null;
}
/**
 * GeoJSON 要素集合接口
 * @description 遵循 GeoJSON RFC 7946 规范的 FeatureCollection 对象定义。
 *              是数据源返回数据的标准格式。
 */
export interface GeoJSONFeatureCollection {
    /** 固定为 "FeatureCollection" */
    type: 'FeatureCollection';
    /** 要素数组 */
    features: GeoJSONFeature[];
}
/**
 * 底图配置
 * @description 控制地图初始化时自动加载的底图瓦片图层。
 *              - 2D 模式：支持自定义 URL 或使用内置 OSM 兜底
 *              - 3D 模式：自动加载内置 OSM 影像 + Cesium World Terrain
 */
export interface BasemapConfig {
    /**
     * 自定义底图瓦片 URL 模板（仅 2D 模式生效）
     * 支持 {x}、{y}、{z} 占位符，也支持 {{env:KEY}} / {{tileBase}} 部署占位符。
     * 优先级高于 preset。不传则使用 preset 指定的预设底图。
     * @example 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
     * @example '{{tileBase}}/{z}/{x}/{y}.png'
     */
    url?: string;
    /**
     * 预设底图类型（仅 2D 模式生效）
     * 当 url 未设置时使用此预设。默认 'osm'。
     * - 'osm'：OpenStreetMap 标准瓦片
     * - 'blank'：不加载任何底图（完全空白）
     */
    preset?: 'osm' | 'blank';
    /** 底图透明度，取值 0~1，默认 1 */
    opacity?: number;
    /** 底图最小可见缩放级别 */
    minZoom?: number;
    /** 底图最大可见缩放级别 */
    maxZoom?: number;
}
/**
 * SDK 初始化主配置
 * @description 创建地图实例时传入的完整配置对象。
 *              SDK 提供基础地图能力（渲染、图层、事件），
 *              业务方通过插件和自定义数据源扩展业务功能。
 *              内部 HTTP/WebSocket 数据获取能力不对外暴露。
 */
export interface MapCoreOptions {
    /** 地图挂载容器：可以是 DOM 元素对象或元素的 ID 字符串 */
    container: HTMLElement | string;
    /** 渲染引擎类型：OpenLayers（2D）或 Cesium（3D） */
    engine: EngineType;
    /**
     * 外部接口使用的坐标系，默认 'EPSG:4326'。
     * - 'EPSG:4326'：传入/接收 WGS84 经纬度 [经度, 纬度]
     * - 'EPSG:3857'：传入/接收 Web Mercator 投影坐标 [x(米), y(米)]
     * SDK 内部自动处理投影转换，适配器层透明。
     */
    coordinateSystem?: CoordinateSystem;
    /** 初始视图状态（中心点、缩放级别等），不传则使用引擎默认视图 */
    initialView?: ViewState;
    /**
     * 底图配置
     * 不传或传 {} 时使用默认底图（2D: OSM，3D: OSM + World Terrain）。
     * 传 { preset: 'blank' } 时不加载底图。
     */
    basemap?: BasemapConfig;
    /** 调试模式配置 */
    debug?: DebugConfig;
    /** 初始化时自动注册的插件列表 */
    plugins?: IPlugin[];
}
/**
 * 插件接口（前置声明，完整定义在 plugin.types.ts）
 * @description SDK 插件的标准接口，所有插件必须实现此接口
 */
export interface IPlugin {
    /** 插件唯一名称标识 */
    readonly name: string;
    /** 插件版本号（遵循 semver 格式，如 "1.0.0"） */
    readonly version: string;
    /** 依赖的其他插件名称列表（在本插件安装前会自动安装依赖） */
    readonly dependencies?: string[];
    /** 插件安装钩子，在 MapController 初始化完成后调用 */
    install(ctx: unknown): void | Promise<void>;
    /** 插件卸载钩子，在 destroy() 或手动卸载时调用，需清理所有资源 */
    uninstall(ctx: unknown): void;
}
/**
 * 外部自定义数据源接口
 * @description 业务方通过实现此接口，将自定义数据注入地图图层。
 *              SDK 不提供 HTTP/WS 等网络数据源给外部使用，
 *              外部数据获取由业务方自行完成，通过此接口传入 GeoJSON 数据。
 *
 * @example
 * ```typescript
 * // 外部自定义数据源示例
 * const mySource: ICustomDataSource = {
 *   id: 'my-targets',
 *   async fetch() {
 *     const res = await fetch('https://my-api.com/targets');
 *     return res.json();
 *   },
 *   dispose() { /* 清理 *\/ },
 * };
 * ```
 */
export interface ICustomDataSource {
    /** 数据源唯一标识 */
    id: string;
    /**
     * 获取数据（由业务方实现）
     * @returns GeoJSON 要素集合
     */
    fetch(): Promise<GeoJSONFeatureCollection>;
    /**
     * 销毁数据源（清理资源）
     */
    dispose(): void;
}
//# sourceMappingURL=map.types.d.ts.map