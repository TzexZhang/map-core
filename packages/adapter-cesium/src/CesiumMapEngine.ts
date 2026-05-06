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

import type {
  IMapEngine,
  LngLat,
  PixelCoord,
  BoundingBox,
  ViewState,
  FlyToOptions,
  MapCoreOptions,
  QueryOptions,
  GeoJSONFeatureCollection,
  GeoJSONFeature,
  LayerConfig,
  EventBus,
} from '@mapcore/core';
import { LayerType, MapError, MapErrorCode, deployConfig } from '@mapcore/core';

/**
 * Cesium Viewer 实例接口（简化）
 * @description 定义本适配器使用的 Cesium Viewer 方法和属性。
 */
interface CesiumViewer {
  camera: {
    position: unknown;
    heading: number;
    pitch: number;
    roll: number;
    flyTo(options: Record<string, unknown>): void;
    setView(options: Record<string, unknown>): void;
    positionCartographic: { longitude: number; latitude: number; height: number };
    moveEnd: { addEventListener(cb: () => void): void; removeEventListener(cb: () => void): void };
  };
  scene: {
    globe: { tilesLoaded: boolean; show: boolean };
    screenSpaceEventHandler: unknown;
    canvas: HTMLElement;
    postRender: { addEventListener(cb: () => void): void };
    pick(position: unknown): unknown;
    primitives: { add(prim: unknown): unknown; remove(prim: unknown): boolean };
  };
  imageryLayers: {
    addImageryProvider(provider: unknown): unknown;
    removeImageryLayer: (layer: unknown) => boolean;
    contains(layer: unknown): boolean;
    raise(layer: unknown, index: number): void;
    get(index: number): unknown;
    length: number;
  };
  dataSources: {
    add(dataSource: unknown): Promise<unknown>;
    remove(dataSource: unknown, destroy?: boolean): boolean;
    get(index: number): unknown;
    getByName(name: string): unknown[];
    contains(dataSource: unknown): boolean;
    length: number;
  };
  terrainProvider: unknown;
  destroy(): void;
  entities: { removeAll(): void };
  screenSpaceEventHandler: {
    setInputAction(cb: (evt: unknown) => void, type: unknown): void;
    removeInputAction(type: unknown): void;
    destroy(): void;
  };
}

/**
 * Cesium 模块引用类型声明
 * @description 为避免直接依赖 Cesium 库导致编译错误，声明所需的 Cesium 类型。
 */
interface CesiumModule {
  Viewer: new (container: HTMLElement, options?: Record<string, unknown>) => CesiumViewer;
  GeoJsonDataSource: {
    load(data: unknown, options?: Record<string, unknown>): Promise<unknown>;
  } & { new (): unknown };
  CzmlDataSource: { new (): { load(data: unknown): Promise<unknown> } };
  Cesium3DTileset: new (options: Record<string, unknown>) => unknown;
  UrlTemplateImageryProvider: new (options: Record<string, unknown>) => unknown;
  WebMapServiceImageryProvider: new (options: Record<string, unknown>) => unknown;
  WebMapTileServiceImageryProvider: new (options: Record<string, unknown>) => unknown;
  CesiumTerrainProvider: {
    fromUrl(url: string, options?: Record<string, unknown>): Promise<unknown>;
  };
  Cartesian2: new (x: number, y: number) => unknown;
  Cartesian3: new (x: number, y: number, z: number) => unknown;
  Cartographic: {
    fromDegrees(lng: number, lat: number, height?: number): unknown;
    toCartesian(cartographic: unknown): unknown;
    fromCartesian(cartesian: unknown): { longitude: number; latitude: number; height: number };
  };
  Math: { toRadians(degrees: number): number; toDegrees(radians: number): number };
  ScreenSpaceEventType: { LEFT_CLICK: number; MOUSE_MOVE: number; RIGHT_CLICK: number };
  SceneTransforms: { worldToWindowCoordinates(scene: unknown, position: unknown): unknown };
  defined(value: unknown): boolean;
  Color: {
    fromCssColorString(css: string): unknown;
    WHITE: unknown;
  };
  Ion: { defaultAccessToken: string };
}

/**
 * Cesium 图层包装器
 * @description 统一包装不同类型的 Cesium 图层对象
 * （ImageryLayer、DataSource、Primitive 等），便于统一管理。
 */
interface CesiumLayerWrapper {
  /** 图层类型 */
  type: 'imagery' | 'datasource' | 'primitive' | 'terrain';
  /** Cesium 原生图层对象 */
  nativeLayer: unknown;
  /** 是否可见 */
  visible: boolean;
  /** 透明度（仅 imagery 类型有效） */
  opacity: number;
}

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
export class CesiumMapEngine implements IMapEngine {
  /** Cesium Viewer 实例 */
  private viewer: CesiumViewer | null = null;

  /** Cesium 模块引用 */
  private cesium: CesiumModule | null = null;

  /** 图层注册表：图层 ID → CesiumLayerWrapper */
  private layerRegistry: Map<string, CesiumLayerWrapper> = new Map();

  /** 事件总线引用 */
  private eventBus: EventBus | null = null;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /**
   * 初始化 Cesium 引擎
   * @description 创建 Viewer 实例，配置初始相机姿态，注册交互事件。
   *
   * @param container - DOM 容器元素
   * @param options - SDK 初始化配置
   * @throws 引擎创建失败时抛出 MapError
   */
  async init(container: HTMLElement, options: MapCoreOptions): Promise<void> {
    try {
      this.cesium = await this.loadCesium();
      const Cesium = this.cesium;

      const cesiumBaseUrl = deployConfig.getCesiumBaseUrl();
      if (cesiumBaseUrl) {
        (window as unknown as Record<string, unknown>).CESIUM_BASE_URL = cesiumBaseUrl;
      }

      const cesiumIonServer = deployConfig.getCesiumIonServer();
      if (cesiumIonServer === null) {
        Cesium.Ion.defaultAccessToken = '';
      }

      const viewerOptions: Record<string, unknown> = {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        creditContainer: document.createElement('div'),
      };

      this.viewer = new Cesium.Viewer(container, viewerOptions);

      if (options.initialView) {
        const center = options.initialView.center;
        const height = center.length > 2 ? (center as number[])[2] : 10000000;
        this.viewer.camera.flyTo({
          destination: Cesium.Cartographic.fromDegrees(center[0], center[1], height),
          orientation: {
            heading: Cesium.Math.toRadians(options.initialView.heading ?? 0),
            pitch: Cesium.Math.toRadians(options.initialView.pitch ?? -90),
            roll: 0,
          },
          duration: 0,
        });
      }

      this.registerCesiumEvents();
      this.initialized = true;
    } catch (error) {
      throw MapError.initFailed(
        `Cesium 引擎初始化失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 销毁 Cesium 引擎
   */
  destroy(): void {
    if (!this.viewer) return;

    this.layerRegistry.clear();
    this.viewer.entities.removeAll();
    this.viewer.screenSpaceEventHandler?.destroy();
    this.viewer.destroy();
    this.viewer = null;
    this.cesium = null;
    this.initialized = false;
  }

  /**
   * 设置视图（立即跳转）
   */
  setView(state: Partial<ViewState>): void {
    this.assertReady('setView');
    const Cesium = this.cesium!;

    const currentCamera = this.viewer!.camera.positionCartographic;
    const center = state.center ?? [
      Cesium.Math.toDegrees(currentCamera.longitude),
      Cesium.Math.toDegrees(currentCamera.latitude),
    ];
    const height =
      state.center && state.center.length > 2
        ? (state.center as number[])[2]
        : currentCamera.height;

    this.viewer!.camera.setView({
      destination: Cesium.Cartographic.fromDegrees(center[0], center[1], height),
      orientation: {
        heading: Cesium.Math.toRadians(state.heading ?? 0),
        pitch: Cesium.Math.toRadians(state.pitch ?? -90),
        roll: 0,
      },
    });
  }

  /**
   * 获取当前视图状态
   */
  getView(): ViewState {
    this.assertReady('getView');
    const Cesium = this.cesium!;
    const camera = this.viewer!.camera;

    const cartographic = camera.positionCartographic;
    const lng = Cesium.Math.toDegrees(cartographic.longitude);
    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    const height = cartographic.height;

    const zoom = Math.max(0, Math.round(22 - Math.log2(height / 100)));

    return {
      center: [lng, lat] as LngLat,
      zoom,
      heading: Cesium.Math.toDegrees(camera.heading),
      pitch: Cesium.Math.toDegrees(camera.pitch),
    };
  }

  /**
   * 飞行到目标位置（带动画）
   */
  async flyTo(options: FlyToOptions): Promise<void> {
    this.assertReady('flyTo');
    const Cesium = this.cesium!;

    const height = options.center.length > 2 ? (options.center as number[])[2] : undefined;

    return new Promise<void>((resolve) => {
      this.viewer!.camera.flyTo({
        destination: Cesium.Cartographic.fromDegrees(options.center[0], options.center[1], height),
        orientation: {
          heading: Cesium.Math.toRadians(options.heading ?? 0),
          pitch: Cesium.Math.toRadians(options.pitch ?? -90),
          roll: 0,
        },
        duration: (options.duration ?? 1000) / 1000,
        complete: () => resolve(),
        cancel: () => resolve(),
      });
    });
  }

  /**
   * 获取当前可视范围
   */
  getBounds(): BoundingBox {
    this.assertReady('getBounds');
    const camera = this.viewer!.camera;
    const cartographic = camera.positionCartographic;

    const lat = this.cesium!.Math.toDegrees(cartographic.latitude);
    const lng = this.cesium!.Math.toDegrees(cartographic.longitude);
    const range = cartographic.height;

    const latExtent = Math.min(degreesFromMeters(range) ?? 30, 89);
    const lngExtent = Math.min(latExtent * 1.5, 179);

    return {
      west: lng - lngExtent,
      south: lat - latExtent,
      east: lng + lngExtent,
      north: lat + latExtent,
    };
  }

  /**
   * 地理坐标 → 屏幕坐标
   */
  project(lngLat: LngLat): PixelCoord | null {
    this.assertReady('project');
    const Cesium = this.cesium!;
    const cartesian = Cesium.Cartographic.fromDegrees(lngLat[0], lngLat[1], 0);

    if (!cartesian) return null;

    const windowPos = Cesium.SceneTransforms.worldToWindowCoordinates(
      this.viewer!.scene,
      cartesian
    );

    if (!windowPos) return null;

    return [
      (windowPos as { x: number; y: number }).x,
      (windowPos as { x: number; y: number }).y,
    ] as PixelCoord;
  }

  /**
   * 屏幕坐标 → 地理坐标
   */
  unproject(pixel: PixelCoord): LngLat {
    this.assertReady('unproject');
    const Cesium = this.cesium!;

    const cartesian2 = new Cesium.Cartesian2(pixel[0], pixel[1]);
    const picked = this.viewer!.scene.pick(cartesian2);

    if (!Cesium.defined(picked)) {
      const camera = this.viewer!.camera;
      const cartographic = camera.positionCartographic;
      return [
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude),
      ] as LngLat;
    }

    const cartographic = Cesium.Cartographic.fromCartesian(picked);
    if (!cartographic) return [0, 0] as LngLat;

    return [
      Cesium.Math.toDegrees(cartographic.longitude),
      Cesium.Math.toDegrees(cartographic.latitude),
    ] as LngLat;
  }

  /**
   * 添加图层
   */
  addLayer(config: LayerConfig): void {
    this.assertReady('addLayer');

    if (this.layerRegistry.has(config.id)) {
      throw new MapError(
        `图层 ID "${config.id}" 已存在`,
        MapErrorCode.E3001_LAYER_DUPLICATE_ID,
        'CesiumMapEngine'
      );
    }

    let wrapper: CesiumLayerWrapper;

    switch (config.type) {
      case LayerType.Tile:
        wrapper = this.addImageryLayer(config);
        break;
      case LayerType.WMS:
        wrapper = this.addWMSLayer(config);
        break;
      case LayerType.WMTS:
        wrapper = this.addWMTSLayer(config);
        break;
      case LayerType.Vector:
        wrapper = this.addGeoJsonLayer(config);
        break;
      case LayerType.Tileset3D:
        wrapper = this.add3DTilesetLayer(config);
        break;
      case LayerType.Terrain:
        void this.setTerrain(config);
        return;
      case LayerType.CZML:
        wrapper = this.addCZMLLayer(config);
        break;
      default:
        throw new MapError(
          `Cesium 不支持图层类型: ${config.type}`,
          MapErrorCode.E2003_UNSUPPORTED_LAYER_TYPE,
          'CesiumMapEngine'
        );
    }

    this.layerRegistry.set(config.id, wrapper);
  }

  /**
   * 移除图层
   */
  removeLayer(layerId: string): void {
    this.assertReady('removeLayer');
    const wrapper = this.layerRegistry.get(layerId);
    if (!wrapper) {
      throw MapError.layerNotFound(layerId);
    }

    switch (wrapper.type) {
      case 'imagery':
        this.viewer!.imageryLayers.removeImageryLayer(wrapper.nativeLayer);
        break;
      case 'datasource':
        this.viewer!.dataSources.remove(wrapper.nativeLayer, true);
        break;
      case 'primitive':
        this.viewer!.scene.primitives.remove(wrapper.nativeLayer);
        break;
    }

    this.layerRegistry.delete(layerId);
  }

  /**
   * 设置图层可见性
   */
  setLayerVisible(layerId: string, visible: boolean): void {
    this.assertReady('setLayerVisible');
    const wrapper = this.getLayerOrThrow(layerId);
    wrapper.visible = visible;

    switch (wrapper.type) {
      case 'imagery':
        (wrapper.nativeLayer as { show: boolean }).show = visible;
        break;
      case 'datasource':
        (wrapper.nativeLayer as { show: boolean }).show = visible;
        break;
      case 'primitive':
        (wrapper.nativeLayer as { show: boolean }).show = visible;
        break;
    }
  }

  /**
   * 设置图层透明度
   */
  setLayerOpacity(layerId: string, opacity: number): void {
    this.assertReady('setLayerOpacity');
    const wrapper = this.getLayerOrThrow(layerId);
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    wrapper.opacity = clampedOpacity;

    if (wrapper.type === 'imagery') {
      (wrapper.nativeLayer as { alpha: number }).alpha = clampedOpacity;
    }
  }

  /**
   * 设置图层 z-index（Cesium 通过 imageryLayers 顺序管理）
   */
  setLayerZIndex(layerId: string, _zIndex: number): void {
    this.assertReady('setLayerZIndex');
    const wrapper = this.getLayerOrThrow(layerId);
    if (wrapper.type === 'imagery') {
      // Cesium ImageryLayer 顺序由 add 顺序决定
    }
  }

  /**
   * 更新矢量图层数据
   */
  async updateLayerData(layerId: string, data: GeoJSONFeatureCollection): Promise<void> {
    this.assertReady('updateLayerData');
    const wrapper = this.getLayerOrThrow(layerId);

    if (wrapper.type === 'datasource') {
      const ds = wrapper.nativeLayer as {
        entities: { removeAll(): void };
        load(data: unknown): Promise<void>;
      };
      ds.entities.removeAll();
      await ds.load(JSON.parse(JSON.stringify(data)));
    }
  }

  /**
   * 查询像素处要素
   */
  queryFeaturesByPixel(pixel: PixelCoord, _options?: QueryOptions): GeoJSONFeature[] {
    this.assertReady('queryFeaturesByPixel');
    const Cesium = this.cesium!;
    const cartesian2 = new Cesium.Cartesian2(pixel[0], pixel[1]);
    const picked = this.viewer!.scene.pick(cartesian2);

    if (Cesium.defined(picked) && (picked as Record<string, unknown>).id) {
      const entity = (picked as Record<string, unknown>).id as Record<string, unknown>;
      return [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [] },
          properties: (entity.properties as Record<string, unknown>) ?? {},
        },
      ];
    }

    return [];
  }

  /**
   * 查询范围内要素
   */
  queryFeaturesByBBox(_bbox: BoundingBox, _layerIds?: string[]): GeoJSONFeature[] {
    this.assertReady('queryFeaturesByBBox');
    return [];
  }

  /**
   * 获取 Cesium Viewer 原生实例
   */
  getNativeInstance(): unknown {
    return this.viewer;
  }

  /**
   * 设置事件总线引用
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  // ==================== 私有方法 ====================

  /**
   * 动态加载 Cesium 库
   */
  private async loadCesium(): Promise<CesiumModule> {
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).Cesium) {
      return (window as unknown as Record<string, unknown>).Cesium as CesiumModule;
    }

    try {
      const cesium = await import('cesium');
      return cesium as unknown as CesiumModule;
    } catch {
      throw new Error('无法加载 Cesium 库。请确保已安装 cesium 包或通过 CDN 引入。');
    }
  }

  /**
   * 注册 Cesium 交互事件
   */
  private registerCesiumEvents(): void {
    if (!this.viewer || !this.eventBus || !this.cesium) return;

    const Cesium = this.cesium;

    this.viewer.screenSpaceEventHandler.setInputAction((evt: unknown) => {
      const event = evt as { position: { x: number; y: number } };
      const pixel: PixelCoord = [event.position.x, event.position.y];

      const cartesian = this.viewer!.scene.pick(event.position as unknown);
      let lngLat: LngLat = [0, 0];

      if (Cesium.defined(cartesian)) {
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        if (cartographic) {
          lngLat = [
            Cesium.Math.toDegrees(cartographic.longitude),
            Cesium.Math.toDegrees(cartographic.latitude),
          ];
        }
      }

      const features = this.queryFeaturesByPixel(pixel);

      this.eventBus!.emit('map:click', {
        lngLat,
        pixel,
        features,
        originalEvent: null,
      });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  /**
   * 添加影像底图图层
   */
  private addImageryLayer(config: LayerConfig): CesiumLayerWrapper {
    const tileConfig = config as { url: string; tileSize?: number; crossOrigin?: string };
    const provider = new this.cesium!.UrlTemplateImageryProvider({
      url: tileConfig.url,
      minimumLevel: 0,
      maximumLevel: 22,
    });
    const layer = this.viewer!.imageryLayers.addImageryProvider(provider);
    return { type: 'imagery', nativeLayer: layer, visible: true, opacity: 1 };
  }

  /**
   * 添加 WMS 图层
   */
  private addWMSLayer(config: LayerConfig): CesiumLayerWrapper {
    const wmsConfig = config as { url: string; layers: string; format?: string };
    const provider = new this.cesium!.WebMapServiceImageryProvider({
      url: wmsConfig.url,
      layers: wmsConfig.layers,
      parameters: {
        FORMAT: wmsConfig.format ?? 'image/png',
        TRANSPARENT: true,
      },
    });
    const layer = this.viewer!.imageryLayers.addImageryProvider(provider);
    return { type: 'imagery', nativeLayer: layer, visible: true, opacity: 1 };
  }

  /**
   * 添加 WMTS 图层
   */
  private addWMTSLayer(config: LayerConfig): CesiumLayerWrapper {
    const wmtsConfig = config as { url: string; layer: string; format?: string };
    const provider = new this.cesium!.WebMapTileServiceImageryProvider({
      url: wmtsConfig.url,
      layer: wmtsConfig.layer,
      style: 'default',
      tileMatrixSetID: 'default',
      format: wmtsConfig.format ?? 'image/png',
    });
    const layer = this.viewer!.imageryLayers.addImageryProvider(provider);
    return { type: 'imagery', nativeLayer: layer, visible: true, opacity: 1 };
  }

  /**
   * 添加 GeoJSON 数据源图层
   */
  private addGeoJsonLayer(config: LayerConfig): CesiumLayerWrapper {
    const ds = new (this.cesium!.GeoJsonDataSource as unknown as {
      new (): { load(data: unknown): Promise<void>; show: boolean };
    })();
    const wrapper: CesiumLayerWrapper = {
      type: 'datasource',
      nativeLayer: ds,
      visible: true,
      opacity: 1,
    };

    if ((config as { sourceId?: string }).sourceId) {
      // 数据由 DataSourceManager 提供，初始化时加载空数据源
      void this.viewer!.dataSources.add(ds);
    }

    return wrapper;
  }

  /**
   * 添加 3D Tiles 图层
   */
  private add3DTilesetLayer(config: LayerConfig): CesiumLayerWrapper {
    const tilesetConfig = config as { url: string; maximumScreenSpaceError?: number };
    const tileset = new this.cesium!.Cesium3DTileset({
      url: tilesetConfig.url,
      maximumScreenSpaceError: tilesetConfig.maximumScreenSpaceError ?? 16,
    });
    const primitive = this.viewer!.scene.primitives.add(tileset);
    return { type: 'primitive', nativeLayer: primitive, visible: true, opacity: 1 };
  }

  /**
   * 设置地形提供者
   */
  private async setTerrain(config: LayerConfig): Promise<void> {
    const terrainConfig = config as { url: string };
    const terrain = await this.cesium!.CesiumTerrainProvider.fromUrl(terrainConfig.url);
    this.viewer!.terrainProvider = terrain;
  }

  /**
   * 添加 CZML 数据源图层
   */
  private addCZMLLayer(config: LayerConfig): CesiumLayerWrapper {
    const czmlConfig = config as { url?: string; data?: unknown[] };
    const ds = new this.cesium!.CzmlDataSource();

    if (czmlConfig.url) {
      void ds.load(czmlConfig.url);
    } else if (czmlConfig.data) {
      void ds.load(czmlConfig.data);
    }

    void this.viewer!.dataSources.add(ds);
    return { type: 'datasource', nativeLayer: ds, visible: true, opacity: 1 };
  }

  /**
   * 获取图层包装器或抛出错误
   */
  private getLayerOrThrow(layerId: string): CesiumLayerWrapper {
    const wrapper = this.layerRegistry.get(layerId);
    if (!wrapper) {
      throw MapError.layerNotFound(layerId);
    }
    return wrapper;
  }

  /**
   * 检查引擎是否已初始化
   */
  private assertReady(method: string): void {
    if (!this.initialized || !this.viewer) {
      throw MapError.engineNotReady(method);
    }
  }
}

/**
 * 辅助：从米转换为经纬度范围近似值
 */
function degreesFromMeters(meters: number): number | null {
  if (!Number.isFinite(meters)) return null;
  return meters / 111320;
}

// 挂载到 Math 对象上的辅助（避免命名冲突）
const _cesiumMath = {
  degreesFromMeters,
};
export { _cesiumMath };
