/**
 * @file 地图引擎统一抽象接口
 * @description 定义所有上层代码依赖的地图引擎接口（IMapEngine）。
 *              OLMapEngine（OpenLayers 2D）和 CesiumMapEngine（Cesium 3D）均需完整实现此接口。
 *              业务代码只依赖此接口，不依赖具体引擎实现（依赖倒置原则）。
 * @module MapCore.Interfaces.IMapEngine
 */
import type {
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
} from '../types';
/**
 * 地图引擎统一抽象接口
 * @description 屏蔽 OpenLayers 与 Cesium 的底层 API 差异，对外暴露统一的操作方法。
 *              包含生命周期管理、视图控制、坐标转换、图层操作和要素查询等核心能力。
 */
export interface IMapEngine {
  /**
   * 初始化地图引擎（异步）
   * 包含：创建引擎实例、挂载 DOM、加载资源、注册内部事件监听。
   *
   * @param container - 地图挂载的 DOM 容器元素
   * @param options - SDK 初始化配置（含引擎类型、视图、代理等）
   * @returns Promise<void>，resolve 表示初始化完成
   * @throws 当容器无效、引擎加载失败时抛出错误
   */
  init(container: HTMLElement, options: MapCoreOptions): Promise<void>;
  /**
   * 销毁地图引擎，释放所有占用的资源
   * 调用后该引擎实例不可再使用，包括：
   * - 移除所有图层
   * - 解绑 DOM 事件
   * - 释放 WebGL 上下文
   * - 置空内部引用
   */
  destroy(): void;
  /**
   * 设置地图视图（立即跳转，无动画过渡）
   *
   * @param state - 目标视图状态（支持部分更新，仅传入需要修改的字段）
   */
  setView(state: Partial<ViewState>): void;
  /**
   * 获取当前地图视图状态
   *
   * @returns 当前完整的视图状态快照
   */
  getView(): ViewState;
  /**
   * 飞行到目标位置（带平滑动画过渡）
   * 支持自定义动画时长、缓动函数以及 3D 相机角度。
   *
   * @param options - 飞行目标参数（中心点、缩放、动画时长等）
   * @returns Promise<void>，动画结束时 resolve
   */
  flyTo(options: FlyToOptions): Promise<void>;
  /**
   * 获取当前地图可视范围的包围盒
   *
   * @returns 当前可视范围的经纬度边界
   */
  getBounds(): BoundingBox;
  /**
   * 地理坐标 → 屏幕像素坐标（投影）
   *
   * @param lngLat - 待转换的经纬度坐标 [经度, 纬度]
   * @returns 对应的屏幕像素坐标 [x, y]，若坐标不在当前视口内则返回 null
   */
  project(lngLat: LngLat): PixelCoord | null;
  /**
   * 屏幕像素坐标 → 地理坐标（逆投影）
   *
   * @param pixel - 屏幕像素坐标 [x, y]（相对于地图容器左上角）
   * @returns 对应的经纬度坐标 [经度, 纬度]
   */
  unproject(pixel: PixelCoord): LngLat;
  /**
   * 添加图层到地图
   * 根据 config.type 自动创建对应类型的图层实例。
   * - Tile/WMS/WMTS → 栅格瓦片图层
   * - Vector → 矢量要素图层
   * - Heatmap → 热力图图层
   * - Tileset3D/Terrain/CZML → Cesium 三维图层
   *
   * @param config - 图层配置（根据类型传入对应的配置接口）
   */
  addLayer(config: LayerConfig): void;
  /**
   * 移除指定图层
   *
   * @param layerId - 要移除的图层 ID（对应添加时 config.id）
   */
  removeLayer(layerId: string): void;
  /**
   * 设置图层可见性
   *
   * @param layerId - 图层 ID
   * @param visible - 是否可见（true 显示，false 隐藏）
   */
  setLayerVisible(layerId: string, visible: boolean): void;
  /**
   * 设置图层透明度
   *
   * @param layerId - 图层 ID
   * @param opacity - 透明度值，范围 0（完全透明）~ 1（完全不透明）
   */
  setLayerOpacity(layerId: string, opacity: number): void;
  /**
   * 调整图层叠加顺序（z-index）
   *
   * @param layerId - 图层 ID
   * @param zIndex - 新的 z-index 值，数值越大越靠上层
   */
  setLayerZIndex(layerId: string, zIndex: number): void;
  /**
   * 更新矢量图层的要素数据
   * 清除图层原有数据，替换为新的 GeoJSON 数据。
   * 仅适用于矢量图层（Vector），其他类型图层调用无效。
   *
   * @param layerId - 图层 ID
   * @param data - 新的 GeoJSON 要素集合数据
   */
  updateLayerData(layerId: string, data: GeoJSONFeatureCollection): void;
  /**
   * 根据屏幕像素坐标查询命中的要素
   * 使用射线拾取或像素命中检测，返回指定位置处的所有要素。
   *
   * @param pixel - 屏幕像素坐标 [x, y]
   * @param options - 查询选项（命中容差、限定图层等）
   * @returns 命中的 GeoJSON 要素数组，无命中返回空数组
   */
  queryFeaturesByPixel(pixel: PixelCoord, options?: QueryOptions): GeoJSONFeature[];
  /**
   * 根据地理范围查询要素
   * 返回指定包围盒范围内的所有可见要素。
   *
   * @param bbox - 查询范围的包围盒
   * @param layerIds - 限定查询的图层 ID 列表，不传则查询所有可见图层
   * @returns 范围内的 GeoJSON 要素数组
   */
  queryFeaturesByBBox(bbox: BoundingBox, layerIds?: string[]): GeoJSONFeature[];
  /**
   * 获取底层引擎的原生实例
   * 用于访问 SDK 未封装的底层 API，提供"逃生舱口"。
   *
   * 注意事项：
   * - 直接操作底层实例可能导致 SDK 内部状态不同步
   * - 建议仅在 SDK API 无法满足需求时使用
   * - 使用后如需恢复 SDK 管理，应调用对应的同步方法
   *
   * @returns OpenLayers 返回 ol/Map 实例，Cesium 返回 Cesium.Viewer 实例
   */
  getNativeInstance(): unknown;
}
//# sourceMappingURL=IMapEngine.d.ts.map
