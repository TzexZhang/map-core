/**
 * @file OpenLayers 2D 引擎适配器实现
 * @description 将 IMapEngine 接口映射到 OpenLayers 具体 API。
 *              实现地图初始化、视图控制、坐标转换、图层管理和要素查询等核心能力。
 *
 * 坐标系说明：
 *   - SDK 统一使用 WGS84（EPSG:4326）经纬度
 *   - OL 默认使用 Web Mercator（EPSG:3857）
 *   - 本适配器内部自动完成坐标转换
 *
 * @module MapCore.Adapter.OL
 */
import type { IMapEngine, LngLat, PixelCoord, BoundingBox, ViewState, FlyToOptions, MapCoreOptions, QueryOptions, GeoJSONFeatureCollection, GeoJSONFeature, LayerConfig, EventBus } from '@geomapcore/core';
/**
 * OpenLayers 2D 引擎适配器
 * @description 实现 IMapEngine 接口，将所有操作映射到 OpenLayers API。
 *              负责 OL 实例的创建、管理和销毁，以及坐标系的自动转换。
 *
 * 核心职责：
 * 1. 创建和管理 OL Map 实例
 * 2. 根据图层配置创建对应的 OL Layer 和 Source
 * 3. 将 WGS84 坐标自动转换为 EPSG:3857
 * 4. 转发 OL 原生事件到 EventBus
 */
export declare class OLMapEngine implements IMapEngine {
    /** OpenLayers Map 实例，初始化后赋值 */
    private olMap;
    /** OL 模块引用，通过动态导入获取 */
    private ol;
    /** 图层注册表：图层 ID → OL Layer 实例 */
    private layerRegistry;
    /** 事件总线引用（由 MapController 注入） */
    private eventBus;
    /** 是否已初始化 */
    private initialized;
    /** 外部接口使用的坐标系 */
    private coordinateSystem;
    /**
     * 将外部坐标转换为 OL 内部坐标（EPSG:3857）
     * - 如果外部使用 EPSG:4326 → 做 lngLatToMercator 转换
     * - 如果外部使用 EPSG:3857 → 直接透传
     */
    private toInternal;
    /**
     * 将 OL 内部坐标（EPSG:3857）转换为外部坐标
     * - 如果外部使用 EPSG:4326 → 做 mercatorToLngLat 转换
     * - 如果外部使用 EPSG:3857 → 直接透传
     */
    private toExternal;
    /**
     * 初始化 OpenLayers 引擎
     * @description 创建 OL Map 和 View 实例，挂载到 DOM 容器，
     *              注册 OL 原生事件并转发到 EventBus。
     *
     * @param container - 地图挂载的 DOM 容器
     * @param options - SDK 初始化配置
     * @throws 引擎创建失败时抛出 MapError
     */
    init(container: HTMLElement, options: MapCoreOptions): Promise<void>;
    /**
     * 销毁 OpenLayers 引擎
     * @description 移除所有图层、清除事件监听、解绑 DOM、释放资源。
     */
    destroy(): void;
    /**
     * 设置地图视图（立即跳转，无动画）
     * @param state - 目标视图状态（支持部分更新）
     */
    setView(state: Partial<ViewState>): void;
    /**
     * 获取当前地图视图状态
     * @returns 当前视图状态快照
     */
    getView(): ViewState;
    /**
     * 飞行到目标位置（带平滑动画）
     * @param options - 飞行参数
     */
    flyTo(options: FlyToOptions): Promise<void>;
    /**
     * 获取当前地图可视范围
     * @returns 经纬度格式的包围盒
     */
    getBounds(): BoundingBox;
    /**
     * 地理坐标 → 屏幕像素坐标
     * @param lngLat - 经纬度坐标
     * @returns 像素坐标，超出视口返回 null
     */
    project(lngLat: LngLat): PixelCoord | null;
    /**
     * 屏幕像素坐标 → 外部坐标
     * @param pixel - 像素坐标
     * @returns 外部坐标系下的坐标
     */
    unproject(pixel: PixelCoord): LngLat;
    /**
     * 添加图层
     * @description 根据 config.type 创建对应的 OL Layer 和 Source 实例。
     * @param config - 图层配置
     */
    addLayer(config: LayerConfig): void;
    /**
     * 移除图层
     * @param layerId - 图层 ID
     */
    removeLayer(layerId: string): void;
    /**
     * 设置图层可见性
     */
    setLayerVisible(layerId: string, visible: boolean): void;
    /**
     * 设置图层透明度
     */
    setLayerOpacity(layerId: string, opacity: number): void;
    /**
     * 设置图层 z-index
     */
    setLayerZIndex(layerId: string, zIndex: number): void;
    /**
     * 更新矢量图层数据
     * @param layerId - 图层 ID
     * @param data - 新的 GeoJSON 数据
     */
    updateLayerData(layerId: string, data: GeoJSONFeatureCollection): void;
    /**
     * 根据像素坐标查询要素
     */
    queryFeaturesByPixel(pixel: PixelCoord, options?: QueryOptions): GeoJSONFeature[];
    /**
     * 根据包围盒查询要素
     */
    queryFeaturesByBBox(_bbox: BoundingBox, _layerIds?: string[]): GeoJSONFeature[];
    /**
     * 获取 OL Map 原生实例
     * @returns ol/Map 实例
     */
    getNativeInstance(): unknown;
    /**
     * 设置事件总线引用
     * @param eventBus - 事件总线实例
     */
    setEventBus(eventBus: EventBus): void;
    /**
     * 动态加载 OpenLayers 库
     * @description 尝试从全局变量或动态导入获取 OL 模块。
     * @returns OL 模块引用
     */
    private loadOL;
    private injectCSS;
    /**
     * 注册 OL 原生事件，转发到 EventBus
     * @description 监听 OL Map 的 click、pointermove、moveend 等原生事件，
     *              转换为 SDK 标准事件格式后通过 EventBus 发布。
     */
    private registerOLEvents;
    /**
     * 创建瓦片图层（XYZ 格式）
     */
    private createTileLayer;
    /**
     * 创建矢量图层
     */
    private createVectorLayer;
    /**
     * 创建 WMS 图层
     */
    private createWMSLayer;
    /**
     * 创建 WMTS 图层
     */
    private createWMTSLayer;
    /**
     * 创建热力图图层
     */
    private createHeatmapLayer;
    /**
     * 获取图层或抛出未找到错误
     */
    private getLayerOrThrow;
    /**
     * 检查引擎是否已初始化
     */
    private assertReady;
}
//# sourceMappingURL=OLMapEngine.d.ts.map