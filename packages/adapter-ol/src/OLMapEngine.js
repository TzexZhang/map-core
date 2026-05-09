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
import { LayerType, MapError, MapErrorCode, lngLatToMercator, mercatorToLngLat, } from '@mapcore/core';
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
export class OLMapEngine {
    constructor() {
        /** OpenLayers Map 实例，初始化后赋值 */
        this.olMap = null;
        /** OL 模块引用，通过动态导入获取 */
        this.ol = null;
        /** 图层注册表：图层 ID → OL Layer 实例 */
        this.layerRegistry = new Map();
        /** 事件总线引用（由 MapController 注入） */
        this.eventBus = null;
        /** 是否已初始化 */
        this.initialized = false;
        /** 外部接口使用的坐标系 */
        this.coordinateSystem = 'EPSG:4326';
    }
    /**
     * 将外部坐标转换为 OL 内部坐标（EPSG:3857）
     * - 如果外部使用 EPSG:4326 → 做 lngLatToMercator 转换
     * - 如果外部使用 EPSG:3857 → 直接透传
     */
    toInternal(coord) {
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
    toExternal(coord) {
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
    async init(container, options) {
        try {
            this.ol = await this.loadOL();
            await this.injectCSS();
            this.coordinateSystem = options.coordinateSystem ?? 'EPSG:4326';
            const viewOptions = {
                maxZoom: 22,
                minZoom: 0,
            };
            if (options.initialView) {
                const center = options.initialView.center;
                viewOptions.center = this.toInternal(center);
                viewOptions.zoom = options.initialView.zoom ?? 4;
                if (options.initialView.rotation !== undefined) {
                    viewOptions.rotation = options.initialView.rotation;
                }
            }
            else {
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
        }
        catch (error) {
            throw MapError.initFailed(`OpenLayers 引擎初始化失败: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
        }
    }
    /**
     * 销毁 OpenLayers 引擎
     * @description 移除所有图层、清除事件监听、解绑 DOM、释放资源。
     */
    destroy() {
        if (!this.olMap)
            return;
        for (const [_layerId, layer] of this.layerRegistry) {
            try {
                this.olMap.removeLayer(layer);
            }
            catch (_ignored) {
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
    setView(state) {
        this.assertReady('setView');
        const view = this.olMap.getView();
        if (state.center) {
            view.setCenter(this.toInternal(state.center));
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
    getView() {
        this.assertReady('getView');
        const view = this.olMap.getView();
        const center = view.getCenter();
        const externalCenter = center
            ? this.toExternal(center)
            : [0, 0];
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
    async flyTo(options) {
        this.assertReady('flyTo');
        const view = this.olMap.getView();
        const center = this.toInternal([options.center[0], options.center[1]]);
        return new Promise((resolve) => {
            view.animate({
                center: center,
                zoom: options.zoom,
                duration: options.duration ?? 1000,
                easing: options.easing ?? ((t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)),
            });
            setTimeout(() => resolve(), options.duration ?? 1000);
        });
    }
    /**
     * 获取当前地图可视范围
     * @returns 经纬度格式的包围盒
     */
    getBounds() {
        this.assertReady('getBounds');
        const view = this.olMap.getView();
        const size = this.olMap.getSize() ?? [0, 0];
        const extent = view.calculateExtent(size);
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
    project(lngLat) {
        this.assertReady('project');
        const internal = this.toInternal(lngLat);
        const pixel = this.olMap.getPixelFromCoordinate(internal);
        if (!pixel)
            return null;
        return [pixel[0], pixel[1]];
    }
    /**
     * 屏幕像素坐标 → 外部坐标
     * @param pixel - 像素坐标
     * @returns 外部坐标系下的坐标
     */
    unproject(pixel) {
        this.assertReady('unproject');
        const mercator = this.olMap.getCoordinateFromPixel(pixel);
        if (!mercator)
            return [0, 0];
        return this.toExternal(mercator);
    }
    /**
     * 添加图层
     * @description 根据 config.type 创建对应的 OL Layer 和 Source 实例。
     * @param config - 图层配置
     */
    addLayer(config) {
        this.assertReady('addLayer');
        if (this.layerRegistry.has(config.id)) {
            throw new MapError(`图层 ID "${config.id}" 已存在`, MapErrorCode.E3001_LAYER_DUPLICATE_ID, 'OLMapEngine');
        }
        let layer;
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
                throw new MapError(`OpenLayers 不支持图层类型: ${config.type}`, MapErrorCode.E2003_UNSUPPORTED_LAYER_TYPE, 'OLMapEngine');
        }
        layer.set('mapcoreLayerId', config.id);
        layer.setVisible(config.visible ?? true);
        layer.setOpacity(config.opacity ?? 1);
        if (config.zIndex !== undefined) {
            layer.setZIndex(config.zIndex);
        }
        this.olMap.addLayer(layer);
        this.layerRegistry.set(config.id, layer);
    }
    /**
     * 移除图层
     * @param layerId - 图层 ID
     */
    removeLayer(layerId) {
        this.assertReady('removeLayer');
        const layer = this.layerRegistry.get(layerId);
        if (!layer) {
            throw MapError.layerNotFound(layerId);
        }
        this.olMap.removeLayer(layer);
        this.layerRegistry.delete(layerId);
    }
    /**
     * 设置图层可见性
     */
    setLayerVisible(layerId, visible) {
        this.assertReady('setLayerVisible');
        const layer = this.getLayerOrThrow(layerId);
        layer.setVisible(visible);
    }
    /**
     * 设置图层透明度
     */
    setLayerOpacity(layerId, opacity) {
        this.assertReady('setLayerOpacity');
        const layer = this.getLayerOrThrow(layerId);
        layer.setOpacity(Math.max(0, Math.min(1, opacity)));
    }
    /**
     * 设置图层 z-index
     */
    setLayerZIndex(layerId, zIndex) {
        this.assertReady('setLayerZIndex');
        const layer = this.getLayerOrThrow(layerId);
        layer.setZIndex(zIndex);
    }
    /**
     * 更新矢量图层数据
     * @param layerId - 图层 ID
     * @param data - 新的 GeoJSON 数据
     */
    updateLayerData(layerId, data) {
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
                });
                source.addFeatures(features);
            }
        }
    }
    /**
     * 根据像素坐标查询要素
     */
    queryFeaturesByPixel(pixel, options) {
        this.assertReady('queryFeaturesByPixel');
        const features = [];
        const hitTolerance = options?.hitTolerance ?? 5;
        this.olMap.forEachFeatureAtPixel(pixel, (olFeature) => {
            if (olFeature && typeof olFeature.get === 'function') {
                const f = olFeature;
                const props = f.get('properties');
                const geom = f.getGeometry();
                features.push({
                    type: 'Feature',
                    geometry: geom ? { type: 'Point', coordinates: [] } : null,
                    properties: props ?? {},
                });
            }
            return undefined;
        }, { hitTolerance });
        return features;
    }
    /**
     * 根据包围盒查询要素
     */
    queryFeaturesByBBox(_bbox, _layerIds) {
        this.assertReady('queryFeaturesByBBox');
        return [];
    }
    /**
     * 获取 OL Map 原生实例
     * @returns ol/Map 实例
     */
    getNativeInstance() {
        return this.olMap;
    }
    /**
     * 设置事件总线引用
     * @param eventBus - 事件总线实例
     */
    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }
    // ==================== 私有方法 ====================
    /**
     * 动态加载 OpenLayers 库
     * @description 尝试从全局变量或动态导入获取 OL 模块。
     * @returns OL 模块引用
     */
    async loadOL() {
        if (typeof window !== 'undefined' && window.ol) {
            return window.ol;
        }
        try {
            const [{ default: OLMap }, { default: OLView }, { default: TileLayer }, { default: VectorLayer }, { default: ImageLayer }, { default: HeatmapLayer }, { default: XYZSource }, { default: TileWMSSource }, { default: WMTSSource }, { default: VectorSource }, { default: ImageWMSSource }, { default: ClusterSource }, { default: GeoJSONFormat }, { default: PointGeom }, { default: OLFeature }, { fromLonLat, toLonLat, transformExtent },] = await Promise.all([
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
            ]);
            return {
                Map: OLMap,
                View: OLView,
                Feature: OLFeature,
                layer: {
                    Tile: TileLayer,
                    Vector: VectorLayer,
                    Image: ImageLayer,
                    Heatmap: HeatmapLayer,
                },
                source: {
                    XYZ: XYZSource,
                    TileWMS: TileWMSSource,
                    WMTS: WMTSSource,
                    Vector: VectorSource,
                    ImageWMS: ImageWMSSource,
                    Cluster: ClusterSource,
                },
                format: {
                    GeoJSON: GeoJSONFormat,
                },
                geom: {
                    Point: PointGeom,
                },
                proj: { fromLonLat, toLonLat, transformExtent },
            };
        }
        catch {
            throw new Error('无法加载 OpenLayers 库。请确保已安装 ol 包或通过 CDN 引入。');
        }
    }
    async injectCSS() {
        if (typeof document === 'undefined')
            return;
        if (document.querySelector('link[data-ol-css], style[data-ol-css]'))
            return;
        try {
            await import('ol/ol.css');
            const style = document.createElement('style');
            style.setAttribute('data-ol-css', 'true');
            style.textContent = '';
            document.head.appendChild(style);
        }
        catch {
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
    registerOLEvents() {
        if (!this.olMap || !this.eventBus)
            return;
        this.olMap.on('click', (evt) => {
            const pixel = evt.pixel;
            const coordinate = evt.coordinate;
            const lngLat = this.toExternal(coordinate);
            const features = this.queryFeaturesByPixel(pixel);
            this.eventBus.emit('map:click', {
                lngLat,
                pixel,
                features,
                originalEvent: evt.originalEvent,
            });
        });
        this.olMap.on('pointermove', (evt) => {
            const pixel = evt.pixel;
            const coordinate = evt.coordinate;
            const lngLat = this.toExternal(coordinate);
            this.eventBus.emit('map:pointermove', {
                lngLat,
                pixel,
                originalEvent: evt.originalEvent,
            });
        });
        this.olMap.on('moveend', () => {
            const view = this.olMap.getView();
            const center = view.getCenter();
            const lngLat = center
                ? this.toExternal(center)
                : [0, 0];
            this.eventBus.emit('map:moveend', {
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
    createTileLayer(config) {
        const tileConfig = config;
        const source = new this.ol.source.XYZ({
            url: tileConfig.url,
            tileSize: tileConfig.tileSize ?? 256,
            crossOrigin: tileConfig.crossOrigin ?? 'anonymous',
        });
        return new this.ol.layer.Tile({ source });
    }
    /**
     * 创建矢量图层
     */
    createVectorLayer(_config) {
        const source = new this.ol.source.Vector();
        return new this.ol.layer.Vector({ source });
    }
    /**
     * 创建 WMS 图层
     */
    createWMSLayer(config) {
        const wmsConfig = config;
        const source = new this.ol.source.TileWMS({
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
        return new this.ol.layer.Tile({ source });
    }
    /**
     * 创建 WMTS 图层
     */
    createWMTSLayer(config) {
        const wmtsConfig = config;
        const source = new this.ol.source.WMTS({
            url: wmtsConfig.url,
            layer: wmtsConfig.layer,
            matrixSet: wmtsConfig.matrixSet,
            format: wmtsConfig.format ?? 'image/png',
        });
        return new this.ol.layer.Tile({ source });
    }
    /**
     * 创建热力图图层
     */
    createHeatmapLayer(config) {
        const heatmapConfig = config;
        const source = new this.ol.source.Vector();
        return new this.ol.layer.Heatmap({
            source,
            radius: heatmapConfig.radius ?? 8,
            blur: heatmapConfig.blur ?? 15,
        });
    }
    /**
     * 获取图层或抛出未找到错误
     */
    getLayerOrThrow(layerId) {
        const layer = this.layerRegistry.get(layerId);
        if (!layer) {
            throw MapError.layerNotFound(layerId);
        }
        return layer;
    }
    /**
     * 检查引擎是否已初始化
     */
    assertReady(method) {
        if (!this.initialized || !this.olMap) {
            throw MapError.engineNotReady(method);
        }
    }
}
//# sourceMappingURL=OLMapEngine.js.map