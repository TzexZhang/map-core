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

import type {
  IMapEngine,
  LayerConfig,
  LayerState,
  ViewState,
  FlyToOptions,
  BoundingBox,
  MapCoreOptions,
  GeoJSONFeatureCollection,
  IPlugin,
  PluginContext,
  EventHandler,
  ICustomDataSource,
  BasemapConfig,
} from '@mapcore/core';
import {
  EngineType,
  LayerType,
  EventBus,
  Logger,
  MapError,
  MapErrorCode,
  resolveContainer,
  deployConfig,
} from '@mapcore/core';
import { OLMapEngine } from '@mapcore/adapter-ol';
import { CesiumMapEngine } from '@mapcore/adapter-cesium';
import { PluginManager } from './PluginManager';

/**
 * 图层管理器（内嵌实现）
 * @description 管理 SDK 中所有图层的增删改查、分组和状态导出。
 */
class LayerManager {
  /** 图层状态注册表：图层 ID → 状态 */
  private layers: Map<string, LayerState> = new Map();

  /** 图层分组注册表：分组 ID → 图层 ID 集合 */
  private groups: Map<string, Set<string>> = new Map();

  /** 地图引擎引用 */
  private engine: IMapEngine;

  /** 事件总线 */
  private eventBus: EventBus;

  /** 日志器 */
  private logger: Logger;

  constructor(engine: IMapEngine, eventBus: EventBus) {
    this.engine = engine;
    this.eventBus = eventBus;
    this.logger = new Logger('LayerManager');
  }

  /**
   * 添加图层
   * @param config - 图层配置
   * @param groupId - 可选的分组 ID
   * @returns 图层 ID
   */
  addLayer(config: LayerConfig, groupId?: string): string {
    if (this.layers.has(config.id)) {
      throw new MapError(
        `图层 ID "${config.id}" 已存在`,
        MapErrorCode.E3001_LAYER_DUPLICATE_ID,
        'LayerManager'
      );
    }

    this.engine.addLayer(config);

    const state: LayerState = {
      config,
      visible: config.visible ?? true,
      opacity: config.opacity ?? 1,
      loadStatus: 'loaded',
      lastUpdate: Date.now(),
    };
    this.layers.set(config.id, state);

    if (groupId) {
      if (!this.groups.has(groupId)) {
        this.groups.set(groupId, new Set());
      }
      this.groups.get(groupId)!.add(config.id);
    }

    this.eventBus.emit('layer:add', { layerId: config.id, config });
    this.logger.info(config.id, `图层已添加 (${config.type})`);

    return config.id;
  }

  /**
   * 批量添加图层
   */
  addLayers(configs: LayerConfig[], groupId?: string): string[] {
    return configs.map((config) => this.addLayer(config, groupId));
  }

  /**
   * 移除图层
   */
  removeLayer(layerId: string): void {
    if (!this.layers.has(layerId)) {
      throw MapError.layerNotFound(layerId);
    }

    this.engine.removeLayer(layerId);

    for (const [, groupSet] of this.groups) {
      groupSet.delete(layerId);
    }

    this.layers.delete(layerId);
    this.eventBus.emit('layer:remove', { layerId });
    this.logger.info(layerId, '图层已移除');
  }

  /**
   * 设置图层可见性
   */
  setLayerVisible(layerId: string, visible: boolean): void {
    this.assertLayerExists(layerId);
    this.engine.setLayerVisible(layerId, visible);
    this.layers.get(layerId)!.visible = visible;
    this.eventBus.emit('layer:visibility', { layerId, visible });
  }

  /**
   * 设置图层透明度
   */
  setLayerOpacity(layerId: string, opacity: number): void {
    this.assertLayerExists(layerId);
    this.engine.setLayerOpacity(layerId, opacity);
    this.layers.get(layerId)!.opacity = opacity;
  }

  /**
   * 更新矢量图层数据
   */
  updateLayerData(layerId: string, data: GeoJSONFeatureCollection): void {
    this.assertLayerExists(layerId);
    this.engine.updateLayerData(layerId, data);
    const state = this.layers.get(layerId)!;
    state.lastUpdate = Date.now();
    state.loadStatus = 'loaded';
  }

  /**
   * 按分组设置图层可见性
   */
  setGroupVisible(groupId: string, visible: boolean): void {
    const group = this.groups.get(groupId);
    if (!group) return;
    for (const layerId of group) {
      this.setLayerVisible(layerId, visible);
    }
  }

  /**
   * 获取图层状态
   */
  getLayerState(layerId: string): LayerState | undefined {
    return this.layers.get(layerId);
  }

  /**
   * 获取所有图层状态
   */
  getLayerStates(): LayerState[] {
    return Array.from(this.layers.values());
  }

  /**
   * 导出所有图层配置
   */
  exportConfigs(): LayerConfig[] {
    return Array.from(this.layers.values()).map((s) => s.config);
  }

  /**
   * 从配置恢复图层
   */
  importConfigs(configs: LayerConfig[]): void {
    for (const [layerId] of this.layers) {
      try {
        this.removeLayer(layerId);
      } catch {
        /* 忽略 */
      }
    }
    this.addLayers(configs);
  }

  /**
   * 销毁图层管理器
   */
  destroy(): void {
    for (const [layerId] of this.layers) {
      try {
        this.engine.removeLayer(layerId);
      } catch {
        /* 忽略 */
      }
    }
    this.layers.clear();
    this.groups.clear();
  }

  private assertLayerExists(layerId: string): void {
    if (!this.layers.has(layerId)) {
      throw MapError.layerNotFound(layerId);
    }
  }
}

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
export class MapController {
  /** 地图引擎实例 */
  private engine: IMapEngine;

  /** 图层管理器 */
  private layerManager: LayerManager;

  /** 外部自定义数据源注册表 */
  private customDataSources: Map<string, ICustomDataSource> = new Map();

  /** 自定义数据源定时刷新器 */
  private customSourceTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  /** 插件管理器 */
  private pluginManager: PluginManager;

  /** 事件总线 */
  private eventBus: EventBus;

  /** 日志器 */
  private logger: Logger;

  /** SDK 初始化配置 */
  private options: MapCoreOptions;

  /** 是否已销毁 */
  private destroyed: boolean = false;

  /**
   * 私有构造函数
   */
  private constructor(engine: IMapEngine, options: MapCoreOptions) {
    this.engine = engine;
    this.options = options;
    this.eventBus = new EventBus();
    this.logger = new Logger('MapController');
    this.layerManager = new LayerManager(engine, this.eventBus);

    const pluginContext = this.createPluginContext();
    this.pluginManager = new PluginManager(pluginContext);
  }

  get sdkOptions(): MapCoreOptions {
    return this.options;
  }

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
  static async create(options: MapCoreOptions): Promise<MapController> {
    if (!options.container) {
      throw MapError.validationError('container 参数不能为空');
    }
    if (!options.engine) {
      throw MapError.validationError('engine 参数不能为空');
    }

    MapController.initDeployConfig();

    const container = resolveContainer(options.container);

    let engine: IMapEngine;
    switch (options.engine) {
      case EngineType.OpenLayers:
        engine = new OLMapEngine();
        break;
      case EngineType.Cesium:
        engine = new CesiumMapEngine();
        break;
      default:
        throw MapError.validationError(`不支持的引擎类型: ${options.engine}`);
    }

    await engine.init(container, options);

    if (
      'setEventBus' in engine &&
      typeof (engine as Record<string, unknown>).setEventBus === 'function'
    ) {
      (engine as { setEventBus: (bus: EventBus) => void }).setEventBus(new EventBus());
    }

    const controller = new MapController(engine, options);

    controller.loadBasemap(options.engine, options.basemap);

    if (options.plugins && options.plugins.length > 0) {
      for (const plugin of options.plugins) {
        await controller.pluginManager.use(plugin);
      }
    }

    controller.eventBus.emit('system:ready', {
      timestamp: Date.now(),
      engineType: options.engine,
    });

    controller.logger.info('create', `MapCore SDK 初始化完成 (${options.engine})`);

    if (options.debug?.enabled) {
      (window as unknown as Record<string, unknown>).__mapcore_debug__ = {
        eventBus: controller.eventBus,
        layerManager: controller.layerManager,
        engine: controller.engine,
      };
    }

    return controller;
  }

  // ==================== 图层操作 API ====================

  /**
   * 添加图层
   * @param config - 图层配置
   * @param groupId - 可选的分组 ID
   * @returns 图层 ID
   */
  addLayer(config: LayerConfig, groupId?: string): string {
    this.assertNotDestroyed();
    const resolvedConfig = this.resolveLayerUrl(config);
    return this.layerManager.addLayer(resolvedConfig, groupId);
  }

  /**
   * 批量添加图层
   */
  addLayers(configs: LayerConfig[], groupId?: string): string[] {
    this.assertNotDestroyed();
    const resolvedConfigs = configs.map((c) => this.resolveLayerUrl(c));
    return this.layerManager.addLayers(resolvedConfigs, groupId);
  }

  /**
   * 移除图层
   */
  removeLayer(layerId: string): void {
    this.assertNotDestroyed();
    this.layerManager.removeLayer(layerId);
  }

  /**
   * 设置图层可见性
   */
  setLayerVisible(layerId: string, visible: boolean): void {
    this.assertNotDestroyed();
    this.layerManager.setLayerVisible(layerId, visible);
  }

  /**
   * 设置图层透明度（0~1）
   */
  setLayerOpacity(layerId: string, opacity: number): void {
    this.assertNotDestroyed();
    this.layerManager.setLayerOpacity(layerId, opacity);
  }

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
  updateLayerData(layerId: string, data: GeoJSONFeatureCollection): void {
    this.assertNotDestroyed();
    this.layerManager.updateLayerData(layerId, data);
  }

  /**
   * 按分组设置图层可见性
   */
  setGroupVisible(groupId: string, visible: boolean): void {
    this.assertNotDestroyed();
    this.layerManager.setGroupVisible(groupId, visible);
  }

  /**
   * 获取图层状态
   */
  getLayerState(layerId: string): LayerState | undefined {
    return this.layerManager.getLayerState(layerId);
  }

  /**
   * 获取所有图层状态
   */
  getLayerStates(): LayerState[] {
    return this.layerManager.getLayerStates();
  }

  /**
   * 导出图层配置（用于状态持久化）
   */
  exportLayerConfigs(): LayerConfig[] {
    return this.layerManager.exportConfigs();
  }

  /**
   * 导入图层配置（恢复状态）
   */
  importLayerConfigs(configs: LayerConfig[]): void {
    this.assertNotDestroyed();
    this.layerManager.importConfigs(configs);
  }

  // ==================== 自定义数据源 API ====================

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
  registerCustomDataSource(source: ICustomDataSource): void {
    this.assertNotDestroyed();
    if (this.customDataSources.has(source.id)) {
      throw new MapError(
        `自定义数据源 ID "${source.id}" 已存在`,
        MapErrorCode.E4001_SOURCE_DUPLICATE_ID,
        'MapController'
      );
    }
    this.customDataSources.set(source.id, source);
    this.logger.info(source.id, '自定义数据源已注册');
  }

  /**
   * 注销自定义数据源
   */
  unregisterCustomDataSource(sourceId: string): void {
    this.assertNotDestroyed();
    this.stopCustomDataSource(sourceId);
    const source = this.customDataSources.get(sourceId);
    if (source) {
      source.dispose();
      this.customDataSources.delete(sourceId);
      this.logger.info(sourceId, '自定义数据源已注销');
    }
  }

  /**
   * 从自定义数据源拉取数据并更新关联图层
   * @param sourceId - 数据源 ID
   * @returns 拉取到的数据
   */
  async fetchFromCustomSource(sourceId: string): Promise<GeoJSONFeatureCollection> {
    this.assertNotDestroyed();
    const source = this.customDataSources.get(sourceId);
    if (!source) {
      throw MapError.sourceNotFound(sourceId);
    }

    const data = await source.fetch();

    this.eventBus.emit('datasource:update', {
      sourceId,
      data,
      timestamp: Date.now(),
      sourceType: 'custom' as never,
    });

    return data;
  }

  /**
   * 启动自定义数据源定时刷新
   * @param sourceId - 数据源 ID
   * @param interval - 刷新间隔（毫秒）
   */
  startCustomDataSource(sourceId: string, interval: number): void {
    this.assertNotDestroyed();
    this.stopCustomDataSource(sourceId);

    const timer = setInterval(async () => {
      try {
        await this.fetchFromCustomSource(sourceId);
      } catch (err) {
        this.logger.error(sourceId, '定时刷新失败', err);
      }
    }, interval);

    this.customSourceTimers.set(sourceId, timer);

    this.fetchFromCustomSource(sourceId).catch((err) => {
      this.logger.error(sourceId, '首次拉取失败', err);
    });
  }

  /**
   * 停止自定义数据源定时刷新
   */
  stopCustomDataSource(sourceId: string): void {
    const timer = this.customSourceTimers.get(sourceId);
    if (timer) {
      clearInterval(timer);
      this.customSourceTimers.delete(sourceId);
    }
  }

  // ==================== 视图控制 API ====================

  /**
   * 设置视图（立即跳转）
   */
  setView(state: Partial<ViewState>): void {
    this.assertNotDestroyed();
    this.engine.setView(state);
  }

  /**
   * 获取当前视图状态
   */
  getView(): ViewState {
    this.assertNotDestroyed();
    return this.engine.getView();
  }

  /**
   * 飞行到目标位置（带动画）
   */
  async flyTo(options: FlyToOptions): Promise<void> {
    this.assertNotDestroyed();
    return this.engine.flyTo(options);
  }

  /**
   * 获取当前可视范围
   */
  getBounds(): BoundingBox {
    this.assertNotDestroyed();
    return this.engine.getBounds();
  }

  // ==================== 事件系统 API ====================

  /**
   * 订阅事件
   * @param event - 事件名称（使用 MapEvents 常量）
   * @param handler - 事件处理函数
   * @returns 取消订阅函数
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    return this.eventBus.on(event, handler);
  }

  /**
   * 订阅一次性事件
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.eventBus.once(event, handler);
  }

  /**
   * 取消事件订阅
   */
  off(event: string, handler: EventHandler): void {
    this.eventBus.off(event, handler);
  }

  // ==================== 插件 API ====================

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
  async use(plugin: IPlugin, options?: Record<string, unknown>): Promise<void> {
    this.assertNotDestroyed();
    await this.pluginManager.use(plugin, options);
  }

  /**
   * 卸载插件
   */
  unuse(pluginName: string): void {
    this.assertNotDestroyed();
    this.pluginManager.unuse(pluginName);
  }

  // ==================== 底层访问 API ====================

  /**
   * 获取底层引擎实例（逃生舱口）
   * @description 用于访问 SDK 未封装的底层 API。
   *              直接操作可能导致 SDK 状态不同步。
   */
  getNativeInstance(): unknown {
    this.assertNotDestroyed();
    return this.engine.getNativeInstance();
  }

  /**
   * 获取事件总线实例
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  // ==================== 生命周期 API ====================

  /**
   * 销毁地图实例
   * @description 释放所有资源，调用后该实例不可再使用。
   */
  destroy(): void {
    if (this.destroyed) return;

    this.logger.info('destroy', '正在销毁 MapCore SDK...');

    for (const [sourceId] of this.customDataSources) {
      this.stopCustomDataSource(sourceId);
    }
    for (const [, source] of this.customDataSources) {
      try {
        source.dispose();
      } catch {
        /* 忽略 */
      }
    }
    this.customDataSources.clear();

    this.pluginManager.destroy();
    this.layerManager.destroy();
    this.engine.destroy();
    this.eventBus.clear();

    this.destroyed = true;
    this.logger.info('destroy', 'MapCore SDK 已销毁');
  }

  // ==================== 私有方法 ====================

  /**
   * 创建插件上下文
   */
  private createPluginContext(): PluginContext {
    return {
      layerManager: this.layerManager,
      eventBus: this.eventBus,
      engine: this.engine,
      logger: new Logger('Plugin'),
      dataSourceManager: {
        registerCustomDataSource: this.registerCustomDataSource.bind(this),
        unregisterCustomDataSource: this.unregisterCustomDataSource.bind(this),
        fetchFromCustomSource: this.fetchFromCustomSource.bind(this),
        startCustomDataSource: this.startCustomDataSource.bind(this),
        stopCustomDataSource: this.stopCustomDataSource.bind(this),
      },
      getOptions<T = Record<string, unknown>>(): T {
        return {} as T;
      },
    };
  }

  /**
   * 检查实例是否已销毁
   */
  private assertNotDestroyed(): void {
    if (this.destroyed) {
      throw new MapError(
        'MapController 已销毁，不可再调用任何方法',
        MapErrorCode.E2002_ENGINE_DESTROYED,
        'MapController'
      );
    }
  }

  /**
   * 初始化内部部署配置（私有静态方法）
   * @description 委托 DeployConfigManager 从环境变量加载配置。
   *              DeployConfigManager 内部自动读取 process.env 和 import.meta.env。
   */
  private static initDeployConfig(): void {
    deployConfig.init();
  }

  /**
   * 解析图层配置中的 URL 占位符
   * @description 将瓦片 URL 中的 {{env:KEY}} 和 {{KEY}} 占位符
   *              替换为 DeployConfigManager 中对应的环境变量值。
   *
   * @param config - 原始图层配置
   * @returns URL 已解析的图层配置
   */
  private resolveLayerUrl(config: LayerConfig): LayerConfig {
    const urlFields = ['url'] as const;
    const resolved = { ...config };

    for (const field of urlFields) {
      const value = (resolved as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.includes('{{')) {
        (resolved as Record<string, unknown>)[field] = deployConfig.resolveUrl(value);
      }
    }

    return resolved;
  }

  private static readonly DEFAULT_OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  private loadBasemap(engineType: EngineType, basemap?: BasemapConfig): void {
    const preset = basemap?.preset ?? 'osm';

    if (preset === 'blank') {
      this.logger.info('loadBasemap', '底图预设为 blank，跳过底图加载');
      return;
    }

    if (engineType === EngineType.OpenLayers) {
      this.loadBasemap2D(basemap);
    } else if (engineType === EngineType.Cesium) {
      this.loadBasemap3D(basemap);
    }
  }

  private loadBasemap2D(basemap?: BasemapConfig): void {
    let url = basemap?.url;

    if (!url) {
      const tileServiceBase = deployConfig.getTileServiceBase();
      if (tileServiceBase) {
        url = tileServiceBase;
      } else {
        url = MapController.DEFAULT_OSM_URL;
      }
    }

    if (url.includes('{{')) {
      url = deployConfig.resolveUrl(url);
    }

    const config: LayerConfig = {
      id: '__mapcore_basemap__',
      type: LayerType.Tile,
      url,
      name: '底图',
      visible: true,
      opacity: basemap?.opacity ?? 1,
      minZoom: basemap?.minZoom,
      maxZoom: basemap?.maxZoom,
      zIndex: 0,
    };

    this.layerManager.addLayer(config);
    this.logger.info('loadBasemap2D', `底图已加载: ${url.substring(0, 80)}...`);
  }

  private loadBasemap3D(_basemap?: BasemapConfig): void {
    const native = this.engine.getNativeInstance() as Record<string, unknown> | null;
    if (!native) {
      this.logger.warn('loadBasemap3D', '无法获取 Cesium Viewer 实例');
      return;
    }

    const imageryLayers = native.imageryLayers as
      | {
          addImageryProvider: (provider: unknown) => unknown;
          removeImageryProvider: (provider: unknown) => boolean;
        }
      | undefined;

    if (!imageryLayers) {
      this.logger.warn('loadBasemap3D', '无法获取 Cesium imageryLayers');
      return;
    }

    try {
      const Cesium = (window as unknown as Record<string, unknown>).Cesium as
        | Record<string, unknown>
        | undefined;
      if (!Cesium) {
        this.logger.warn('loadBasemap3D', 'Cesium 全局对象未找到');
        return;
      }

      const TileMapServiceImageryProvider = Cesium.TileMapServiceImageryProvider as
        | (new (options: Record<string, unknown>) => unknown)
        | undefined;

      if (TileMapServiceImageryProvider) {
        const provider = new TileMapServiceImageryProvider({
          url: MapController.DEFAULT_OSM_URL,
        });
        imageryLayers.addImageryProvider(provider);
        this.logger.info('loadBasemap3D', 'OSM 影像底图已加载');
      }

      const createWorldTerrain = Cesium.createWorldTerrain as (() => unknown) | undefined;
      if (createWorldTerrain) {
        const terrainProvider = createWorldTerrain();
        native.terrainProvider = terrainProvider;
        this.logger.info('loadBasemap3D', 'Cesium World Terrain 已加载');
      }
    } catch (err) {
      this.logger.warn(
        'loadBasemap3D',
        `3D 底图加载失败: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
