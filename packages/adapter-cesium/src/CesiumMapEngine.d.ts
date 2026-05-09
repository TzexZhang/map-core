/**
 * @file Cesium 3D 引擎适配器实现
 * @description 将 IMapEngine 接口映射到 Cesium Viewer API。
 *              实现三维地球的初始化、相机控制、坐标转换、图层管理和要素查询等能力。
 *
 * 坐标系说明：
 *   - SDK 统一使用 WGS84 经纬度
 *   - Cesium 内部使用 Cartesian3（三维直角坐标）
 *   - 本适配器内部自动完成坐标转换
 *
 * 性能说明：
 *   - 大量要素优先使用 Primitive API（性能优先）
 *   - 少量交互要素使用 Entity API（便捷优先）
 *   - 实时动态数据推荐使用 CustomDataSource + CZML
 *
 * @module MapCore.Adapter.Cesium
 */
import type { IMapEngine, LngLat, PixelCoord, BoundingBox, ViewState, FlyToOptions, MapCoreOptions, QueryOptions, GeoJSONFeatureCollection, GeoJSONFeature, LayerConfig, EventBus } from '@mapcore/core';
/**
 * Cesium 3D 引擎适配器
 * @description 实现 IMapEngine 接口，将所有操作映射到 Cesium Viewer API。
 *
 * 核心职责：
 * 1. 创建和管理 Cesium Viewer 实例
 * 2. 根据图层配置创建对应的 Cesium 图层（Imagery/DataSource/Primitive）
 * 3. 管理相机视角（flyTo、setView 等）
 * 4. 转发 Cesium 交互事件到 EventBus
 */
export declare class CesiumMapEngine implements IMapEngine {
    /** Cesium Viewer 实例 */
    private viewer;
    /** Cesium 模块引用 */
    private cesium;
    /** 图层注册表：图层 ID → CesiumLayerWrapper */
    private layerRegistry;
    /** 事件总线引用 */
    private eventBus;
    /** 是否已初始化 */
    private initialized;
    private coordinateSystem;
    /**
     * 将外部坐标转换为 Cesium 内部坐标（WGS84 经纬度）
     * - 如果外部使用 EPSG:4326 → 直接透传
     * - 如果外部使用 EPSG:3857 → 做 mercatorToLngLat 转换
     */
    private toInternal;
    /**
     * 将 Cesium 内部坐标（WGS84 经纬度）转换为外部坐标
     * - 如果外部使用 EPSG:4326 → 直接透传
     * - 如果外部使用 EPSG:3857 → 做 lngLatToMercator 转换
     */
    private toExternal;
    /**
     * 初始化 Cesium 引擎
     * @description 创建 Viewer 实例，配置初始相机姿态，注册交互事件。
     *
     * @param container - DOM 容器元素
     * @param options - SDK 初始化配置
     * @throws 引擎创建失败时抛出 MapError
     */
    init(container: HTMLElement, options: MapCoreOptions): Promise<void>;
    /**
     * 销毁 Cesium 引擎
     */
    destroy(): void;
    /**
     * 设置视图（立即跳转）
     */
    setView(state: Partial<ViewState>): void;
    /**
     * 获取当前视图状态
     */
    getView(): ViewState;
    /**
     * 飞行到目标位置（带动画）
     */
    flyTo(options: FlyToOptions): Promise<void>;
    /**
     * 获取当前可视范围
     */
    getBounds(): BoundingBox;
    /**
     * 地理坐标 → 屏幕坐标
     */
    project(lngLat: LngLat): PixelCoord | null;
    /**
     * 屏幕坐标 → 地理坐标
     */
    unproject(pixel: PixelCoord): LngLat;
    /**
     * 添加图层
     */
    addLayer(config: LayerConfig): void;
    /**
     * 移除图层
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
     * 设置图层 z-index（Cesium 通过 imageryLayers 顺序管理）
     */
    setLayerZIndex(layerId: string, _zIndex: number): void;
    /**
     * 更新矢量图层数据
     */
    updateLayerData(layerId: string, data: GeoJSONFeatureCollection): Promise<void>;
    /**
     * 查询像素处要素
     */
    queryFeaturesByPixel(pixel: PixelCoord, _options?: QueryOptions): GeoJSONFeature[];
    /**
     * 查询范围内要素
     */
    queryFeaturesByBBox(_bbox: BoundingBox, _layerIds?: string[]): GeoJSONFeature[];
    /**
     * 获取 Cesium Viewer 原生实例
     */
    getNativeInstance(): unknown;
    /**
     * 设置事件总线引用
     */
    setEventBus(eventBus: EventBus): void;
    /**
     * 动态加载 Cesium 库
     */
    private loadCesium;
    private injectCSS;
    /**
     * 注册 Cesium 交互事件
     */
    private registerCesiumEvents;
    /**
     * 添加影像底图图层
     */
    private addImageryLayer;
    /**
     * 添加 WMS 图层
     */
    private addWMSLayer;
    /**
     * 添加 WMTS 图层
     */
    private addWMTSLayer;
    /**
     * 添加 GeoJSON 数据源图层
     */
    private addGeoJsonLayer;
    /**
     * 添加 3D Tiles 图层
     */
    private add3DTilesetLayer;
    /**
     * 设置地形提供者
     */
    private setTerrain;
    /**
     * 添加 CZML 数据源图层
     */
    private addCZMLLayer;
    /**
     * 获取图层包装器或抛出错误
     */
    private getLayerOrThrow;
    /**
     * 检查引擎是否已初始化
     */
    private assertReady;
}
/**
 * 辅助：从米转换为经纬度范围近似值
 */
declare function degreesFromMeters(meters: number): number | null;
declare const _cesiumMath: {
    degreesFromMeters: typeof degreesFromMeters;
};
export { _cesiumMath };
//# sourceMappingURL=CesiumMapEngine.d.ts.map