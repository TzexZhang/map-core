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
  CoordinateSystem,
} from '@mapcore/core';
import {
  LayerType,
  MapError,
  MapErrorCode,
  lngLatToMercator,
  mercatorToLngLat,
} from '@mapcore/core';

/**
 * OpenLayers 库引用类型声明
 * @description 为避免直接依赖 OL 库导致编译错误，
 *              使用动态导入或全局引用的方式获取 OL 模块。
 *              实际使用时通过 loadOL() 方法获取。
 */
interface OLModule {
  Map: new (options: Record<string, unknown>) => OLMapInstance;
  View: new (options: Record<string, unknown>) => OLViewInstance;
  layer: {
    Tile: new (options: Record<string, unknown>) => OLLayerInstance;
    Vector: new (options: Record<string, unknown>) => OLLayerInstance;
    Image: new (options: Record<string, unknown>) => OLLayerInstance;
    Heatmap: new (options: Record<string, unknown>) => OLLayerInstance;
  };
  source: {
    XYZ: new (options: Record<string, unknown>) => OLSourceInstance;
    TileWMS: new (options: Record<string, unknown>) => OLSourceInstance;
    WMTS: new (options: Record<string, unknown>) => OLSourceInstance;
    Vector: new (options?: Record<string, unknown>) => OLSourceInstance;
    ImageWMS: new (options: Record<string, unknown>) => OLSourceInstance;
    Cluster: new (options: Record<string, unknown>) => OLSourceInstance;
  };
  format: {
    GeoJSON: new () => {
      readFeatures(data: unknown, options?: Record<string, unknown>): unknown[];
    };
  };
  geom: {
    Point: new (coordinates: number[]) => unknown;
  };
  Feature: new (geometry?: unknown) => unknown;
  proj: {
    fromLonLat: (coord: number[]) => number[];
    toLonLat: (coord: number[]) => number[];
    transformExtent: (extent: number[], from: string, to: string) => number[];
  };
}

/** OL Map 实例接口（简化） */
interface OLMapInstance {
  setTarget(target: HTMLElement | string | undefined): void;
  addLayer(layer: OLLayerInstance): void;
  removeLayer(layer: OLLayerInstance): void;
  getLayers(): { getArray(): OLLayerInstance[]; getLength(): number };
  getView(): OLViewInstance;
  getSize(): number[] | undefined;
  on(type: string, callback: (event: Record<string, unknown>) => void): string;
  un(type: string, callback: (event: Record<string, unknown>) => void): void;
  forEachFeatureAtPixel(
    pixel: number[],
    callback: (feature: unknown, layer: unknown) => unknown,
    options?: Record<string, unknown>
  ): unknown;
  getCoordinateFromPixel(pixel: number[]): number[];
  getPixelFromCoordinate(coord: number[]): number[] | undefined;
  updateSize(): void;
  dispose(): void;
  getOverlays(): { clear(): void };
}

/** OL View 实例接口（简化） */
interface OLViewInstance {
  getCenter(): number[];
  setCenter(center: number[]): void;
  getZoom(): number | undefined;
  setZoom(zoom: number): void;
  getRotation(): number;
  setRotation(rotation: number): void;
  getResolution(): number | undefined;
  calculateExtent(size?: number[]): number[];
  animate(options: Record<string, unknown>): void;
  fit(extent: number[], options?: Record<string, unknown>): void;
  on(type: string, callback: () => void): string;
  un(type: string, callback: () => void): void;
}

/** OL Layer 实例接口（简化） */
interface OLLayerInstance {
  get(prop: string): unknown;
  set(prop: string, value: unknown): void;
  setOpacity(opacity: number): void;
  getOpacity(): number;
  setVisible(visible: boolean): void;
  getVisible(): boolean;
  setZIndex(zIndex: number): void;
  getZIndex(): number;
  getSource(): OLSourceInstance;
}

/** OL Source 实例接口（简化） */
interface OLSourceInstance {
  clear(): void;
  addFeature(feature: unknown): void;
  addFeatures(features: unknown[]): void;
  getFeatures(): unknown[];
  getUrl?(): string;
  refresh?(): void;
}

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
export class OLMapEngine implements IMapEngine {
  /** OpenLayers Map 实例，初始化后赋值 */
  private olMap: OLMapInstance | null = null;

  /** OL 模块引用，通过动态导入获取 */
  private ol: OLModule | null = null;

  /** 图层注册表：图层 ID → OL Layer 实例 */
  private layerRegistry: Map<string, OLLayerInstance> = new Map();

  /** 事件总线引用（由 MapController 注入） */
  private eventBus: EventBus | null = null;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /** 外部接口使用的坐标系 */
  private coordinateSystem: CoordinateSystem = 'EPSG:4326';

  /**
   * 将外部坐标转换为 OL 内部坐标（EPSG:3857）
   * - 如果外部使用 EPSG:4326 → 做 lngLatToMercator 转换
   * - 如果外部使用 EPSG:3857 → 直接透传
   */
  private toInternal(coord: [number, number]): [number, number] {
    if (this.coordinateSystem === 'EPSG:3857') {
      return coord;
    }
    return lngLatToMercator(coord);
  }

  /**
   * 将 OL 内部坐标（EPSG:3857）转换为外部坐标
   * - 如果外部使用 EPSG:4326 → 做 mercatorToLngLat 转换
   * - 如果外部使用 EPSG:3857 → 直接透传
   */
  private toExternal(coord: [number, number]): [number, number] {
    if (this.coordinateSystem === 'EPSG:3857') {
      return coord;
    }
    return mercatorToLngLat(coord);
  }

  /**
   * 初始化 OpenLayers 引擎
   * @description 创建 OL Map 和 View 实例，挂载到 DOM 容器，
   *              注册 OL 原生事件并转发到 EventBus。
   *
   * @param container - 地图挂载的 DOM 容器
   * @param options - SDK 初始化配置
   * @throws 引擎创建失败时抛出 MapError
   */
  async init(container: HTMLElement, options: MapCoreOptions): Promise<void> {
    try {
      this.ol = await this.loadOL();
      await this.injectCSS();

      this.coordinateSystem = options.coordinateSystem ?? 'EPSG:4326';

      const viewOptions: Record<string, unknown> = {
        maxZoom: 22,
        minZoom: 0,
      };

      if (options.initialView) {
        const center = options.initialView.center;
        viewOptions.center = this.toInternal(center as [number, number]);
        viewOptions.zoom = options.initialView.zoom ?? 4;
        if (options.initialView.rotation !== undefined) {
          viewOptions.rotation = options.initialView.rotation;
        }
      } else {
        viewOptions.center = this.toInternal([116.397428, 39.90923]);
        viewOptions.zoom = 4;
      }

      const view = new this.ol.View(viewOptions);

      this.olMap = new this.ol.Map({
        target: container,
        view: view,
        layers: [],
        controls: [],
      });

      this.registerOLEvents();

      this.initialized = true;
    } catch (error) {
      throw MapError.initFailed(
        `OpenLayers 引擎初始化失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 销毁 OpenLayers 引擎
   * @description 移除所有图层、清除事件监听、解绑 DOM、释放资源。
   */
  destroy(): void {
    if (!this.olMap) return;

    for (const [_layerId, layer] of this.layerRegistry) {
      try {
        this.olMap.removeLayer(layer);
      } catch (_ignored) {
        // 销毁时忽略单个图层的移除错误
      }
    }
    this.layerRegistry.clear();

    this.olMap.setTarget(undefined);
    this.olMap.dispose();
    this.olMap = null;
    this.ol = null;
    this.initialized = false;
  }

  /**
   * 设置地图视图（立即跳转，无动画）
   * @param state - 目标视图状态（支持部分更新）
   */
  setView(state: Partial<ViewState>): void {
    this.assertReady('setView');
    const view = this.olMap!.getView();

    if (state.center) {
      view.setCenter(this.toInternal(state.center as [number, number]));
    }
    if (state.zoom !== undefined) {
      view.setZoom(state.zoom);
    }
    if (state.rotation !== undefined) {
      view.setRotation(state.rotation);
    }
  }

  /**
   * 获取当前地图视图状态
   * @returns 当前视图状态快照
   */
  getView(): ViewState {
    this.assertReady('getView');
    const view = this.olMap!.getView();
    const center = view.getCenter();
    const externalCenter = center
      ? this.toExternal(center as [number, number])
      : ([0, 0] as [number, number]);

    return {
      center: externalCenter,
      zoom: view.getZoom() ?? 4,
      rotation: view.getRotation(),
    };
  }

  /**
   * 飞行到目标位置（带平滑动画）
   * @param options - 飞行参数
   */
  async flyTo(options: FlyToOptions): Promise<void> {
    this.assertReady('flyTo');
    const view = this.olMap!.getView();
    const center = this.toInternal([options.center[0], options.center[1]] as [number, number]);

    return new Promise<void>((resolve) => {
      view.animate({
        center: center,
        zoom: options.zoom,
        duration: options.duration ?? 1000,
        easing: options.easing ?? ((t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)),
      });

      setTimeout(() => resolve(), options.duration ?? 1000);
    });
  }

  /**
   * 获取当前地图可视范围
   * @returns 经纬度格式的包围盒
   */
  getBounds(): BoundingBox {
    this.assertReady('getBounds');
    const view = this.olMap!.getView();
    const size = this.olMap!.getSize() ?? [0, 0];
    const extent = view.calculateExtent(size) as [number, number, number, number];

    const sw = this.toExternal([extent[0], extent[1]]);
    const ne = this.toExternal([extent[2], extent[3]]);

    return {
      west: sw[0],
      south: sw[1],
      east: ne[0],
      north: ne[1],
    };
  }

  /**
   * 地理坐标 → 屏幕像素坐标
   * @param lngLat - 经纬度坐标
   * @returns 像素坐标，超出视口返回 null
   */
  project(lngLat: LngLat): PixelCoord | null {
    this.assertReady('project');
    const internal = this.toInternal(lngLat);
    const pixel = this.olMap!.getPixelFromCoordinate(internal);
    if (!pixel) return null;
    return [pixel[0], pixel[1]] as PixelCoord;
  }

  /**
   * 屏幕像素坐标 → 外部坐标
   * @param pixel - 像素坐标
   * @returns 外部坐标系下的坐标
   */
  unproject(pixel: PixelCoord): LngLat {
    this.assertReady('unproject');
    const mercator = this.olMap!.getCoordinateFromPixel(pixel) as [number, number];
    if (!mercator) return [0, 0] as LngLat;
    return this.toExternal(mercator);
  }

  /**
   * 添加图层
   * @description 根据 config.type 创建对应的 OL Layer 和 Source 实例。
   * @param config - 图层配置
   */
  addLayer(config: LayerConfig): void {
    this.assertReady('addLayer');

    if (this.layerRegistry.has(config.id)) {
      throw new MapError(
        `图层 ID "${config.id}" 已存在`,
        MapErrorCode.E3001_LAYER_DUPLICATE_ID,
        'OLMapEngine'
      );
    }

    let layer: OLLayerInstance;

    switch (config.type) {
      case LayerType.Tile:
        layer = this.createTileLayer(config);
        break;
      case LayerType.Vector:
        layer = this.createVectorLayer(config);
        break;
      case LayerType.WMS:
        layer = this.createWMSLayer(config);
        break;
      case LayerType.WMTS:
        layer = this.createWMTSLayer(config);
        break;
      case LayerType.Heatmap:
        layer = this.createHeatmapLayer(config);
        break;
      default:
        throw new MapError(
          `OpenLayers 不支持图层类型: ${config.type}`,
          MapErrorCode.E2003_UNSUPPORTED_LAYER_TYPE,
          'OLMapEngine'
        );
    }

    layer.set('mapcoreLayerId', config.id);
    layer.setVisible(config.visible ?? true);
    layer.setOpacity(config.opacity ?? 1);

    if (config.zIndex !== undefined) {
      layer.setZIndex(config.zIndex);
    }

    this.olMap!.addLayer(layer);
    this.layerRegistry.set(config.id, layer);
  }

  /**
   * 移除图层
   * @param layerId - 图层 ID
   */
  removeLayer(layerId: string): void {
    this.assertReady('removeLayer');
    const layer = this.layerRegistry.get(layerId);
    if (!layer) {
      throw MapError.layerNotFound(layerId);
    }

    this.olMap!.removeLayer(layer);
    this.layerRegistry.delete(layerId);
  }

  /**
   * 设置图层可见性
   */
  setLayerVisible(layerId: string, visible: boolean): void {
    this.assertReady('setLayerVisible');
    const layer = this.getLayerOrThrow(layerId);
    layer.setVisible(visible);
  }

  /**
   * 设置图层透明度
   */
  setLayerOpacity(layerId: string, opacity: number): void {
    this.assertReady('setLayerOpacity');
    const layer = this.getLayerOrThrow(layerId);
    layer.setOpacity(Math.max(0, Math.min(1, opacity)));
  }

  /**
   * 设置图层 z-index
   */
  setLayerZIndex(layerId: string, zIndex: number): void {
    this.assertReady('setLayerZIndex');
    const layer = this.getLayerOrThrow(layerId);
    layer.setZIndex(zIndex);
  }

  /**
   * 更新矢量图层数据
   * @param layerId - 图层 ID
   * @param data - 新的 GeoJSON 数据
   */
  updateLayerData(layerId: string, data: GeoJSONFeatureCollection): void {
    this.assertReady('updateLayerData');
    const layer = this.getLayerOrThrow(layerId);
    const source = layer.getSource();

    if (source && typeof source.clear === 'function') {
      source.clear();

      if (this.ol) {
        const format = new this.ol.format.GeoJSON();
        const features = format.readFeatures(JSON.parse(JSON.stringify(data)), {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        }) as unknown[];
        source.addFeatures(features);
      }
    }
  }

  /**
   * 根据像素坐标查询要素
   */
  queryFeaturesByPixel(pixel: PixelCoord, options?: QueryOptions): GeoJSONFeature[] {
    this.assertReady('queryFeaturesByPixel');
    const features: GeoJSONFeature[] = [];
    const hitTolerance = options?.hitTolerance ?? 5;

    this.olMap!.forEachFeatureAtPixel(
      pixel,
      (olFeature: unknown) => {
        if (olFeature && typeof (olFeature as Record<string, unknown>).get === 'function') {
          const f = olFeature as { get(key: string): unknown; getGeometry(): unknown };
          const props = f.get('properties') as Record<string, unknown> | null;
          const geom = f.getGeometry();
          features.push({
            type: 'Feature',
            geometry: geom ? { type: 'Point', coordinates: [] } : null,
            properties: props ?? {},
          });
        }
        return undefined;
      },
      { hitTolerance }
    );

    return features;
  }

  /**
   * 根据包围盒查询要素
   */
  queryFeaturesByBBox(_bbox: BoundingBox, _layerIds?: string[]): GeoJSONFeature[] {
    this.assertReady('queryFeaturesByBBox');
    return [];
  }

  /**
   * 获取 OL Map 原生实例
   * @returns ol/Map 实例
   */
  getNativeInstance(): unknown {
    return this.olMap;
  }

  /**
   * 设置事件总线引用
   * @param eventBus - 事件总线实例
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  // ==================== 私有方法 ====================

  /**
   * 动态加载 OpenLayers 库
   * @description 尝试从全局变量或动态导入获取 OL 模块。
   * @returns OL 模块引用
   */
  private async loadOL(): Promise<OLModule> {
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).ol) {
      return (window as unknown as Record<string, unknown>).ol as OLModule;
    }

    try {
      const [
        { default: OLMap },
        { default: OLView },
        { default: TileLayer },
        { default: VectorLayer },
        { default: ImageLayer },
        { default: HeatmapLayer },
        { default: XYZSource },
        { default: TileWMSSource },
        { default: WMTSSource },
        { default: VectorSource },
        { default: ImageWMSSource },
        { default: ClusterSource },
        { default: GeoJSONFormat },
        { default: PointGeom },
        { default: OLFeature },
        { fromLonLat, toLonLat, transformExtent },
      ] = await Promise.all([
        import('ol/Map'),
        import('ol/View'),
        import('ol/layer/Tile'),
        import('ol/layer/Vector'),
        import('ol/layer/Image'),
        import('ol/layer/Heatmap'),
        import('ol/source/XYZ'),
        import('ol/source/TileWMS'),
        import('ol/source/WMTS'),
        import('ol/source/Vector'),
        import('ol/source/ImageWMS'),
        import('ol/source/Cluster'),
        import('ol/format/GeoJSON'),
        import('ol/geom/Point'),
        import('ol/Feature'),
        import('ol/proj'),
      ])

      return {
        Map: OLMap as unknown as OLModule['Map'],
        View: OLView as unknown as OLModule['View'],
        Feature: OLFeature as unknown as OLModule['Feature'],
        layer: {
          Tile: TileLayer as unknown as OLModule['layer']['Tile'],
          Vector: VectorLayer as unknown as OLModule['layer']['Vector'],
          Image: ImageLayer as unknown as OLModule['layer']['Image'],
          Heatmap: HeatmapLayer as unknown as OLModule['layer']['Heatmap'],
        },
        source: {
          XYZ: XYZSource as unknown as OLModule['source']['XYZ'],
          TileWMS: TileWMSSource as unknown as OLModule['source']['TileWMS'],
          WMTS: WMTSSource as unknown as OLModule['source']['WMTS'],
          Vector: VectorSource as unknown as OLModule['source']['Vector'],
          ImageWMS: ImageWMSSource as unknown as OLModule['source']['ImageWMS'],
          Cluster: ClusterSource as unknown as OLModule['source']['Cluster'],
        },
        format: {
          GeoJSON: GeoJSONFormat as unknown as OLModule['format']['GeoJSON'],
        },
        geom: {
          Point: PointGeom as unknown as OLModule['geom']['Point'],
        },
        proj: { fromLonLat, toLonLat, transformExtent },
      } as OLModule
    } catch {
      throw new Error('无法加载 OpenLayers 库。请确保已安装 ol 包或通过 CDN 引入。');
    }
  }

  private async injectCSS(): Promise<void> {
    if (typeof document === 'undefined') return;
    if (document.querySelector('link[data-ol-css], style[data-ol-css]')) return;
    try {
      await import('ol/ol.css');
      const style = document.createElement('style');
      style.setAttribute('data-ol-css', 'true');
      style.textContent = '';
      document.head.appendChild(style);
    } catch {
      const link = document.createElement('link');
      link.setAttribute('data-ol-css', 'true');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/ol@9/ol.css';
      document.head.appendChild(link);
    }
  }

  /**
   * 注册 OL 原生事件，转发到 EventBus
   * @description 监听 OL Map 的 click、pointermove、moveend 等原生事件，
   *              转换为 SDK 标准事件格式后通过 EventBus 发布。
   */
  private registerOLEvents(): void {
    if (!this.olMap || !this.eventBus) return;

    this.olMap.on('click', (evt: Record<string, unknown>) => {
      const pixel = evt.pixel as number[];
      const coordinate = evt.coordinate as number[];
      const lngLat = this.toExternal(coordinate as [number, number]);

      const features = this.queryFeaturesByPixel(pixel as PixelCoord);

      this.eventBus!.emit('map:click', {
        lngLat,
        pixel,
        features,
        originalEvent: evt.originalEvent,
      });
    });

    this.olMap.on('pointermove', (evt: Record<string, unknown>) => {
      const pixel = evt.pixel as number[];
      const coordinate = evt.coordinate as number[];
      const lngLat = this.toExternal(coordinate as [number, number]);

      this.eventBus!.emit('map:pointermove', {
        lngLat,
        pixel,
        originalEvent: evt.originalEvent,
      });
    });

    this.olMap.on('moveend', () => {
      const view = this.olMap!.getView();
      const center = view.getCenter();
      const lngLat = center
        ? this.toExternal(center as [number, number])
        : ([0, 0] as [number, number]);

      this.eventBus!.emit('map:moveend', {
        viewState: {
          center: lngLat,
          zoom: view.getZoom() ?? 4,
          rotation: view.getRotation(),
        },
        bounds: this.getBounds(),
      });
    });
  }

  /**
   * 创建瓦片图层（XYZ 格式）
   */
  private createTileLayer(config: LayerConfig): OLLayerInstance {
    const tileConfig = config as { url: string; tileSize?: number; crossOrigin?: string };
    const source = new this.ol!.source.XYZ({
      url: tileConfig.url,
      tileSize: tileConfig.tileSize ?? 256,
      crossOrigin: tileConfig.crossOrigin ?? 'anonymous',
    });
    return new this.ol!.layer.Tile({ source });
  }

  /**
   * 创建矢量图层
   */
  private createVectorLayer(_config: LayerConfig): OLLayerInstance {
    const source = new this.ol!.source.Vector();
    return new this.ol!.layer.Vector({ source });
  }

  /**
   * 创建 WMS 图层
   */
  private createWMSLayer(config: LayerConfig): OLLayerInstance {
    const wmsConfig = config as {
      url: string;
      layers: string;
      styles?: string;
      format?: string;
      transparent?: boolean;
      wmsVersion?: string;
    };
    const source = new this.ol!.source.TileWMS({
      url: wmsConfig.url,
      params: {
        LAYERS: wmsConfig.layers,
        STYLES: wmsConfig.styles ?? '',
        FORMAT: wmsConfig.format ?? 'image/png',
        TRANSPARENT: wmsConfig.transparent ?? true,
        VERSION: wmsConfig.wmsVersion ?? '1.3.0',
      },
      crossOrigin: 'anonymous',
    });
    return new this.ol!.layer.Tile({ source });
  }

  /**
   * 创建 WMTS 图层
   */
  private createWMTSLayer(config: LayerConfig): OLLayerInstance {
    const wmtsConfig = config as { url: string; layer: string; matrixSet: string; format?: string };
    const source = new this.ol!.source.WMTS({
      url: wmtsConfig.url,
      layer: wmtsConfig.layer,
      matrixSet: wmtsConfig.matrixSet,
      format: wmtsConfig.format ?? 'image/png',
    } as Record<string, unknown>);
    return new this.ol!.layer.Tile({ source });
  }

  /**
   * 创建热力图图层
   */
  private createHeatmapLayer(config: LayerConfig): OLLayerInstance {
    const heatmapConfig = config as { radius?: number; blur?: number; weightField?: string };
    const source = new this.ol!.source.Vector();
    return new this.ol!.layer.Heatmap({
      source,
      radius: heatmapConfig.radius ?? 8,
      blur: heatmapConfig.blur ?? 15,
    });
  }

  /**
   * 获取图层或抛出未找到错误
   */
  private getLayerOrThrow(layerId: string): OLLayerInstance {
    const layer = this.layerRegistry.get(layerId);
    if (!layer) {
      throw MapError.layerNotFound(layerId);
    }
    return layer;
  }

  /**
   * 检查引擎是否已初始化
   */
  private assertReady(method: string): void {
    if (!this.initialized || !this.olMap) {
      throw MapError.engineNotReady(method);
    }
  }
}
