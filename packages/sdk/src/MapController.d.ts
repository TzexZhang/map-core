/**
 * @file MapController 主控制器实现
 * @description SDK 的核心入口类，是业务方与 SDK 交互的唯一接口。
 *              提供基础地图能力（渲染、图层、视图、事件、插件），
 *              不暴露内部 HTTP/WebSocket 数据获取能力。
 *
 * 外部数据交互方式：
 *   1. 通过 addLayer() + updateLayerData() 直接传入 GeoJSON 数据
 *   2. 通过 registerCustomDataSource() 注册自定义数据源
 *   3. 通过插件机制扩展业务功能
 *
 * 内部数据获取（HTTP/WS）是 SDK 私有能力，不对外暴露。
 *
 * @module MapCore.SDK.MapController
 */
import type { LayerConfig, LayerState, ViewState, FlyToOptions, BoundingBox, MapCoreOptions, GeoJSONFeatureCollection, IPlugin, EventHandler, ICustomDataSource } from '@mapcore/core';
import { EventBus } from '@mapcore/core';
/**
 * MapController 主控制器
 * @description SDK 的核心入口类，业务方通过此类使用所有地图基础能力。
 *
 * 架构原则：
 * - SDK 只提供基础地图能力（渲染、图层、视图、事件）
 * - 内部 HTTP/WebSocket 数据获取是 SDK 私有实现，不对外暴露
 * - 外部通过 registerCustomDataSource() 注册自定义数据源
 * - 外部通过 updateLayerData() 直接推送 GeoJSON 数据
 * - 业务功能通过插件机制扩展
 *
 * @example
 * ```typescript
 * const map = await MapController.create({
 *   container: 'map-container',
 *   engine: EngineType.OpenLayers,
 *   initialView: { center: [116.397, 39.909], zoom: 10 },
 * });
 *
 * // 添加底图
 * map.addLayer({
 *   id: 'base-tile',
 *   type: LayerType.Tile,
 *   url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
 * });
 *
 * // 添加矢量图层并注入自定义数据
 * map.addLayer({ id: 'targets', type: LayerType.Vector });
 * const data = await fetch('/api/targets').then(r => r.json());
 * map.updateLayerData('targets', data);
 *
 * // 注册自定义数据源（定时刷新）
 * map.registerCustomDataSource({
 *   id: 'my-source',
 *   async fetch() {
 *     const res = await fetch('/api/targets');
 *     return res.json();
 *   },
 *   dispose() {},
 * });
 *
 * // 监听事件
 * map.on('map:click', (payload) => {
 *   console.log('点击位置:', payload.lngLat);
 * });
 * ```
 */
export declare class MapController {
    /** 地图引擎实例 */
    private engine;
    /** 图层管理器 */
    private layerManager;
    /** 外部自定义数据源注册表 */
    private customDataSources;
    /** 自定义数据源定时刷新器 */
    private customSourceTimers;
    /** 插件管理器 */
    private pluginManager;
    /** 事件总线 */
    private eventBus;
    /** 日志器 */
    private logger;
    /** SDK 初始化配置 */
    private options;
    /** 是否已销毁 */
    private destroyed;
    /**
     * 私有构造函数
     */
    private constructor();
    get sdkOptions(): MapCoreOptions;
    /**
     * 创建地图实例（工厂方法）
     * @description SDK 的主入口，异步完成所有初始化工作后返回 MapController 实例。
     *
     * @param options - SDK 初始化配置
     * @returns MapController 实例
     *
     * @example
     * ```typescript
     * const map = await MapController.create({
     *   container: 'map',
     *   engine: EngineType.OpenLayers,
     *   initialView: { center: [116.397, 39.909], zoom: 10 },
     * });
     * ```
     */
    static create(options: MapCoreOptions): Promise<MapController>;
    /**
     * 添加图层
     * @param config - 图层配置
     * @param groupId - 可选的分组 ID
     * @returns 图层 ID
     */
    addLayer(config: LayerConfig, groupId?: string): string;
    /**
     * 批量添加图层
     */
    addLayers(configs: LayerConfig[], groupId?: string): string[];
    /**
     * 移除图层
     */
    removeLayer(layerId: string): void;
    /**
     * 设置图层可见性
     */
    setLayerVisible(layerId: string, visible: boolean): void;
    /**
     * 设置图层透明度（0~1）
     */
    setLayerOpacity(layerId: string, opacity: number): void;
    /**
     * 更新矢量图层数据（外部数据注入的核心方法）
     * @description 业务方获取数据后，通过此方法将 GeoJSON 数据推送到指定矢量图层。
     *              这是外部数据进入地图的主要通道。
     *
     * @param layerId - 图层 ID
     * @param data - GeoJSON 要素集合数据
     *
     * @example
     * ```typescript
     * const response = await fetch('/api/targets');
     * const geojsonData = await response.json();
     * map.updateLayerData('targets-layer', geojsonData);
     * ```
     */
    updateLayerData(layerId: string, data: GeoJSONFeatureCollection): void;
    /**
     * 按分组设置图层可见性
     */
    setGroupVisible(groupId: string, visible: boolean): void;
    /**
     * 获取图层状态
     */
    getLayerState(layerId: string): LayerState | undefined;
    /**
     * 获取所有图层状态
     */
    getLayerStates(): LayerState[];
    /**
     * 导出图层配置（用于状态持久化）
     */
    exportLayerConfigs(): LayerConfig[];
    /**
     * 导入图层配置（恢复状态）
     */
    importLayerConfigs(configs: LayerConfig[]): void;
    /**
     * 注册外部自定义数据源
     * @description 业务方实现 ICustomDataSource 接口，将自行获取的数据注入地图。
     *              SDK 不关心数据是如何获取的（HTTP/WS/本地/第三方等），
     *              只负责将返回的 GeoJSON 数据渲染到关联图层。
     *
     * @param source - 自定义数据源实例
     *
     * @example
     * ```typescript
     * map.registerCustomDataSource({
     *   id: 'my-api-source',
     *   async fetch() {
     *     const res = await fetch('https://my-api.com/targets');
     *     return res.json();
     *   },
     *   dispose() { /* 清理资源 *\/ },
     * });
     * ```
     */
    registerCustomDataSource(source: ICustomDataSource): void;
    /**
     * 注销自定义数据源
     */
    unregisterCustomDataSource(sourceId: string): void;
    /**
     * 从自定义数据源拉取数据并更新关联图层
     * @param sourceId - 数据源 ID
     * @returns 拉取到的数据
     */
    fetchFromCustomSource(sourceId: string): Promise<GeoJSONFeatureCollection>;
    /**
     * 启动自定义数据源定时刷新
     * @param sourceId - 数据源 ID
     * @param interval - 刷新间隔（毫秒）
     */
    startCustomDataSource(sourceId: string, interval: number): void;
    /**
     * 停止自定义数据源定时刷新
     */
    stopCustomDataSource(sourceId: string): void;
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
     * 订阅事件
     * @param event - 事件名称（使用 MapEvents 常量）
     * @param handler - 事件处理函数
     * @returns 取消订阅函数
     */
    on<T = unknown>(event: string, handler: EventHandler<T>): () => void;
    /**
     * 订阅一次性事件
     */
    once<T = unknown>(event: string, handler: EventHandler<T>): void;
    /**
     * 取消事件订阅
     */
    off(event: string, handler: EventHandler): void;
    /**
     * 注册并安装插件
     * @description 插件是扩展 SDK 能力的核心机制。业务方通过实现 IPlugin 接口，
     *              在 install() 中使用 PluginContext 访问 SDK 内部能力，
     *              扩展自定义业务功能（测量、绘制、轨迹回放等）。
     *
     * @param plugin - 插件实例
     * @param options - 插件配置
     *
     * @example
     * ```typescript
     * const myPlugin: IPlugin = {
     *   name: 'MyPlugin',
     *   version: '1.0.0',
     *   install(ctx) {
     *     ctx.eventBus.on('map:click', (payload) => {
     *       console.log('插件收到点击:', payload);
     *     });
     *   },
     *   uninstall(ctx) { /* 清理 *\/ },
     * };
     * await map.use(myPlugin);
     * ```
     */
    use(plugin: IPlugin, options?: Record<string, unknown>): Promise<void>;
    /**
     * 卸载插件
     */
    unuse(pluginName: string): void;
    /**
     * 获取底层引擎实例（逃生舱口）
     * @description 用于访问 SDK 未封装的底层 API。
     *              直接操作可能导致 SDK 状态不同步。
     */
    getNativeInstance(): unknown;
    /**
     * 获取事件总线实例
     */
    getEventBus(): EventBus;
    /**
     * 销毁地图实例
     * @description 释放所有资源，调用后该实例不可再使用。
     */
    destroy(): void;
    /**
     * 创建插件上下文
     */
    private createPluginContext;
    /**
     * 检查实例是否已销毁
     */
    private assertNotDestroyed;
    /**
     * 初始化内部部署配置（私有静态方法）
     * @description 委托 DeployConfigManager 从环境变量加载配置。
     *              DeployConfigManager 内部自动读取 process.env 和 import.meta.env。
     */
    private static initDeployConfig;
    /**
     * 解析图层配置中的 URL 占位符
     * @description 将瓦片 URL 中的 {{env:KEY}} 和 {{KEY}} 占位符
     *              替换为 DeployConfigManager 中对应的环境变量值。
     *
     * @param config - 原始图层配置
     * @returns URL 已解析的图层配置
     */
    private resolveLayerUrl;
    private static readonly DEFAULT_OSM_URL;
    private loadBasemap;
    private loadBasemap2D;
    private loadBasemap3D;
}
//# sourceMappingURL=MapController.d.ts.map