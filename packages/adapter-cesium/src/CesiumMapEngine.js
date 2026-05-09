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
import { LayerType, MapError, MapErrorCode, deployConfig, lngLatToMercator, mercatorToLngLat } from '@mapcore/core';
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
export class CesiumMapEngine {
    constructor() {
        /** Cesium Viewer 实例 */
        this.viewer = null;
        /** Cesium 模块引用 */
        this.cesium = null;
        /** 图层注册表：图层 ID → CesiumLayerWrapper */
        this.layerRegistry = new Map();
        /** 事件总线引用 */
        this.eventBus = null;
        /** 是否已初始化 */
        this.initialized = false;
        this.coordinateSystem = 'EPSG:4326';
    }
    /**
     * 将外部坐标转换为 Cesium 内部坐标（WGS84 经纬度）
     * - 如果外部使用 EPSG:4326 → 直接透传
     * - 如果外部使用 EPSG:3857 → 做 mercatorToLngLat 转换
     */
    toInternal(coord) {
        if (this.coordinateSystem === 'EPSG:4326') {
            return coord;
        }
        return mercatorToLngLat(coord);
    }
    /**
     * 将 Cesium 内部坐标（WGS84 经纬度）转换为外部坐标
     * - 如果外部使用 EPSG:4326 → 直接透传
     * - 如果外部使用 EPSG:3857 → 做 lngLatToMercator 转换
     */
    toExternal(coord) {
        if (this.coordinateSystem === 'EPSG:4326') {
            return coord;
        }
        return lngLatToMercator(coord);
    }
    /**
     * 初始化 Cesium 引擎
     * @description 创建 Viewer 实例，配置初始相机姿态，注册交互事件。
     *
     * @param container - DOM 容器元素
     * @param options - SDK 初始化配置
     * @throws 引擎创建失败时抛出 MapError
     */
    async init(container, options) {
        try {
            this.cesium = await this.loadCesium();
            await this.injectCSS();
            this.coordinateSystem = options.coordinateSystem ?? 'EPSG:4326';
            const Cesium = this.cesium;
            const cesiumBaseUrl = deployConfig.getCesiumBaseUrl();
            if (cesiumBaseUrl) {
                window.CESIUM_BASE_URL = cesiumBaseUrl;
            }
            const cesiumIonServer = deployConfig.getCesiumIonServer();
            if (cesiumIonServer === null) {
                Cesium.Ion.defaultAccessToken = '';
            }
            const viewerOptions = {
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
                const rawCenter = options.initialView.center;
                const center = this.toInternal(rawCenter);
                const height = rawCenter.length > 2 ? rawCenter[2] : 10000000;
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
        }
        catch (error) {
            throw MapError.initFailed(`Cesium 引擎初始化失败: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error : undefined);
        }
    }
    /**
     * 销毁 Cesium 引擎
     */
    destroy() {
        if (!this.viewer)
            return;
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
    setView(state) {
        this.assertReady('setView');
        const Cesium = this.cesium;
        const currentCamera = this.viewer.camera.positionCartographic;
        const rawCenter = state.center ?? [
            Cesium.Math.toDegrees(currentCamera.longitude),
            Cesium.Math.toDegrees(currentCamera.latitude),
        ];
        const center = this.toInternal(rawCenter);
        const height = state.center && state.center.length > 2
            ? state.center[2]
            : currentCamera.height;
        this.viewer.camera.setView({
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
    getView() {
        this.assertReady('getView');
        const Cesium = this.cesium;
        const camera = this.viewer.camera;
        const cartographic = camera.positionCartographic;
        const lng = Cesium.Math.toDegrees(cartographic.longitude);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const height = cartographic.height;
        const zoom = Math.max(0, Math.round(22 - Math.log2(height / 100)));
        return {
            center: this.toExternal([lng, lat]),
            zoom,
            heading: Cesium.Math.toDegrees(camera.heading),
            pitch: Cesium.Math.toDegrees(camera.pitch),
        };
    }
    /**
     * 飞行到目标位置（带动画）
     */
    async flyTo(options) {
        this.assertReady('flyTo');
        const Cesium = this.cesium;
        const center = this.toInternal([options.center[0], options.center[1]]);
        const height = options.center.length > 2 ? options.center[2] : undefined;
        return new Promise((resolve) => {
            this.viewer.camera.flyTo({
                destination: Cesium.Cartographic.fromDegrees(center[0], center[1], height),
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
    getBounds() {
        this.assertReady('getBounds');
        const camera = this.viewer.camera;
        const cartographic = camera.positionCartographic;
        const lat = this.cesium.Math.toDegrees(cartographic.latitude);
        const lng = this.cesium.Math.toDegrees(cartographic.longitude);
        const range = cartographic.height;
        const latExtent = Math.min(degreesFromMeters(range) ?? 30, 89);
        const lngExtent = Math.min(latExtent * 1.5, 179);
        const sw = this.toExternal([lng - lngExtent, lat - latExtent]);
        const ne = this.toExternal([lng + lngExtent, lat + latExtent]);
        return {
            west: sw[0],
            south: sw[1],
            east: ne[0],
            north: ne[1],
        };
    }
    /**
     * 地理坐标 → 屏幕坐标
     */
    project(lngLat) {
        this.assertReady('project');
        const Cesium = this.cesium;
        const internal = this.toInternal(lngLat);
        const cartesian = Cesium.Cartographic.fromDegrees(internal[0], internal[1], 0);
        if (!cartesian)
            return null;
        const windowPos = Cesium.SceneTransforms.worldToWindowCoordinates(this.viewer.scene, cartesian);
        if (!windowPos)
            return null;
        return [
            windowPos.x,
            windowPos.y,
        ];
    }
    /**
     * 屏幕坐标 → 地理坐标
     */
    unproject(pixel) {
        this.assertReady('unproject');
        const Cesium = this.cesium;
        const cartesian2 = new Cesium.Cartesian2(pixel[0], pixel[1]);
        const picked = this.viewer.scene.pick(cartesian2);
        if (!Cesium.defined(picked)) {
            const camera = this.viewer.camera;
            const cartographic = camera.positionCartographic;
            return this.toExternal([
                Cesium.Math.toDegrees(cartographic.longitude),
                Cesium.Math.toDegrees(cartographic.latitude),
            ]);
        }
        const cartographic = Cesium.Cartographic.fromCartesian(picked);
        if (!cartographic)
            return [0, 0];
        return this.toExternal([
            Cesium.Math.toDegrees(cartographic.longitude),
            Cesium.Math.toDegrees(cartographic.latitude),
        ]);
    }
    /**
     * 添加图层
     */
    addLayer(config) {
        this.assertReady('addLayer');
        if (this.layerRegistry.has(config.id)) {
            throw new MapError(`图层 ID "${config.id}" 已存在`, MapErrorCode.E3001_LAYER_DUPLICATE_ID, 'CesiumMapEngine');
        }
        let wrapper;
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
                throw new MapError(`Cesium 不支持图层类型: ${config.type}`, MapErrorCode.E2003_UNSUPPORTED_LAYER_TYPE, 'CesiumMapEngine');
        }
        this.layerRegistry.set(config.id, wrapper);
    }
    /**
     * 移除图层
     */
    removeLayer(layerId) {
        this.assertReady('removeLayer');
        const wrapper = this.layerRegistry.get(layerId);
        if (!wrapper) {
            throw MapError.layerNotFound(layerId);
        }
        switch (wrapper.type) {
            case 'imagery':
                this.viewer.imageryLayers.removeImageryLayer(wrapper.nativeLayer);
                break;
            case 'datasource':
                this.viewer.dataSources.remove(wrapper.nativeLayer, true);
                break;
            case 'primitive':
                this.viewer.scene.primitives.remove(wrapper.nativeLayer);
                break;
        }
        this.layerRegistry.delete(layerId);
    }
    /**
     * 设置图层可见性
     */
    setLayerVisible(layerId, visible) {
        this.assertReady('setLayerVisible');
        const wrapper = this.getLayerOrThrow(layerId);
        wrapper.visible = visible;
        switch (wrapper.type) {
            case 'imagery':
                wrapper.nativeLayer.show = visible;
                break;
            case 'datasource':
                wrapper.nativeLayer.show = visible;
                break;
            case 'primitive':
                wrapper.nativeLayer.show = visible;
                break;
        }
    }
    /**
     * 设置图层透明度
     */
    setLayerOpacity(layerId, opacity) {
        this.assertReady('setLayerOpacity');
        const wrapper = this.getLayerOrThrow(layerId);
        const clampedOpacity = Math.max(0, Math.min(1, opacity));
        wrapper.opacity = clampedOpacity;
        if (wrapper.type === 'imagery') {
            wrapper.nativeLayer.alpha = clampedOpacity;
        }
    }
    /**
     * 设置图层 z-index（Cesium 通过 imageryLayers 顺序管理）
     */
    setLayerZIndex(layerId, _zIndex) {
        this.assertReady('setLayerZIndex');
        const wrapper = this.getLayerOrThrow(layerId);
        if (wrapper.type === 'imagery') {
            // Cesium ImageryLayer 顺序由 add 顺序决定
        }
    }
    /**
     * 更新矢量图层数据
     */
    async updateLayerData(layerId, data) {
        this.assertReady('updateLayerData');
        const wrapper = this.getLayerOrThrow(layerId);
        if (wrapper.type === 'datasource') {
            const ds = wrapper.nativeLayer;
            ds.entities.removeAll();
            await ds.load(JSON.parse(JSON.stringify(data)));
        }
    }
    /**
     * 查询像素处要素
     */
    queryFeaturesByPixel(pixel, _options) {
        this.assertReady('queryFeaturesByPixel');
        const Cesium = this.cesium;
        const cartesian2 = new Cesium.Cartesian2(pixel[0], pixel[1]);
        const picked = this.viewer.scene.pick(cartesian2);
        if (Cesium.defined(picked) && picked.id) {
            const entity = picked.id;
            return [
                {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [] },
                    properties: entity.properties ?? {},
                },
            ];
        }
        return [];
    }
    /**
     * 查询范围内要素
     */
    queryFeaturesByBBox(_bbox, _layerIds) {
        this.assertReady('queryFeaturesByBBox');
        return [];
    }
    /**
     * 获取 Cesium Viewer 原生实例
     */
    getNativeInstance() {
        return this.viewer;
    }
    /**
     * 设置事件总线引用
     */
    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }
    // ==================== 私有方法 ====================
    /**
     * 动态加载 Cesium 库
     */
    async loadCesium() {
        if (typeof window !== 'undefined' && window.Cesium) {
            return window.Cesium;
        }
        try {
            const cesium = await import('cesium');
            return cesium;
        }
        catch {
            throw new Error('无法加载 Cesium 库。请确保已安装 cesium 包或通过 CDN 引入。');
        }
    }
    async injectCSS() {
        if (typeof document === 'undefined')
            return;
        if (document.querySelector('link[data-cesium-css], style[data-cesium-css]'))
            return;
        try {
            await import('cesium/Build/Cesium/Widgets/widgets.css');
            const style = document.createElement('style');
            style.setAttribute('data-cesium-css', 'true');
            style.textContent = '';
            document.head.appendChild(style);
        }
        catch {
            const link = document.createElement('link');
            link.setAttribute('data-cesium-css', 'true');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/cesium@1.120/Build/Cesium/Widgets/widgets.css';
            document.head.appendChild(link);
        }
    }
    /**
     * 注册 Cesium 交互事件
     */
    registerCesiumEvents() {
        if (!this.viewer || !this.eventBus || !this.cesium)
            return;
        const Cesium = this.cesium;
        this.viewer.screenSpaceEventHandler.setInputAction((evt) => {
            const event = evt;
            const pixel = [event.position.x, event.position.y];
            const cartesian = this.viewer.scene.pick(event.position);
            let lngLat = [0, 0];
            if (Cesium.defined(cartesian)) {
                const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                if (cartographic) {
                    lngLat = this.toExternal([
                        Cesium.Math.toDegrees(cartographic.longitude),
                        Cesium.Math.toDegrees(cartographic.latitude),
                    ]);
                }
            }
            const features = this.queryFeaturesByPixel(pixel);
            this.eventBus.emit('map:click', {
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
    addImageryLayer(config) {
        const tileConfig = config;
        const provider = new this.cesium.UrlTemplateImageryProvider({
            url: tileConfig.url,
            minimumLevel: 0,
            maximumLevel: 22,
        });
        const layer = this.viewer.imageryLayers.addImageryProvider(provider);
        return { type: 'imagery', nativeLayer: layer, visible: true, opacity: 1 };
    }
    /**
     * 添加 WMS 图层
     */
    addWMSLayer(config) {
        const wmsConfig = config;
        const provider = new this.cesium.WebMapServiceImageryProvider({
            url: wmsConfig.url,
            layers: wmsConfig.layers,
            parameters: {
                FORMAT: wmsConfig.format ?? 'image/png',
                TRANSPARENT: true,
            },
        });
        const layer = this.viewer.imageryLayers.addImageryProvider(provider);
        return { type: 'imagery', nativeLayer: layer, visible: true, opacity: 1 };
    }
    /**
     * 添加 WMTS 图层
     */
    addWMTSLayer(config) {
        const wmtsConfig = config;
        const provider = new this.cesium.WebMapTileServiceImageryProvider({
            url: wmtsConfig.url,
            layer: wmtsConfig.layer,
            style: 'default',
            tileMatrixSetID: 'default',
            format: wmtsConfig.format ?? 'image/png',
        });
        const layer = this.viewer.imageryLayers.addImageryProvider(provider);
        return { type: 'imagery', nativeLayer: layer, visible: true, opacity: 1 };
    }
    /**
     * 添加 GeoJSON 数据源图层
     */
    addGeoJsonLayer(config) {
        const ds = new this.cesium.GeoJsonDataSource();
        const wrapper = {
            type: 'datasource',
            nativeLayer: ds,
            visible: true,
            opacity: 1,
        };
        if (config.sourceId) {
            // 数据由 DataSourceManager 提供，初始化时加载空数据源
            void this.viewer.dataSources.add(ds);
        }
        return wrapper;
    }
    /**
     * 添加 3D Tiles 图层
     */
    add3DTilesetLayer(config) {
        const tilesetConfig = config;
        const tileset = new this.cesium.Cesium3DTileset({
            url: tilesetConfig.url,
            maximumScreenSpaceError: tilesetConfig.maximumScreenSpaceError ?? 16,
        });
        const primitive = this.viewer.scene.primitives.add(tileset);
        return { type: 'primitive', nativeLayer: primitive, visible: true, opacity: 1 };
    }
    /**
     * 设置地形提供者
     */
    async setTerrain(config) {
        const terrainConfig = config;
        const terrain = await this.cesium.CesiumTerrainProvider.fromUrl(terrainConfig.url);
        this.viewer.terrainProvider = terrain;
    }
    /**
     * 添加 CZML 数据源图层
     */
    addCZMLLayer(config) {
        const czmlConfig = config;
        const ds = new this.cesium.CzmlDataSource();
        if (czmlConfig.url) {
            void ds.load(czmlConfig.url);
        }
        else if (czmlConfig.data) {
            void ds.load(czmlConfig.data);
        }
        void this.viewer.dataSources.add(ds);
        return { type: 'datasource', nativeLayer: ds, visible: true, opacity: 1 };
    }
    /**
     * 获取图层包装器或抛出错误
     */
    getLayerOrThrow(layerId) {
        const wrapper = this.layerRegistry.get(layerId);
        if (!wrapper) {
            throw MapError.layerNotFound(layerId);
        }
        return wrapper;
    }
    /**
     * 检查引擎是否已初始化
     */
    assertReady(method) {
        if (!this.initialized || !this.viewer) {
            throw MapError.engineNotReady(method);
        }
    }
}
/**
 * 辅助：从米转换为经纬度范围近似值
 */
function degreesFromMeters(meters) {
    if (!Number.isFinite(meters))
        return null;
    return meters / 111320;
}
// 挂载到 Math 对象上的辅助（避免命名冲突）
const _cesiumMath = {
    degreesFromMeters,
};
export { _cesiumMath };
//# sourceMappingURL=CesiumMapEngine.js.map