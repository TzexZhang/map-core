/**
 * @file 地图相关基础类型定义
 * @description 定义地图 SDK 中使用的所有基础地理坐标类型、视图状态、
 *              渲染引擎枚举以及 SDK 初始化主配置等核心类型。
 *              这些类型是整个 SDK 的基础契约，所有模块均依赖此文件。
 * @module MapCore.Types.Map
 */
/**
 * 渲染引擎类型枚举
 * @description 定义 SDK 支持的地图渲染引擎类型。
 *              选择不同引擎决定了地图的显示模式（2D 平面 / 3D 球体）。
 */
export var EngineType;
(function (EngineType) {
    /** OpenLayers 二维平面地图引擎，适合传统 GIS 应用 */
    EngineType["OpenLayers"] = "openlayers";
    /** Cesium 三维地球引擎，适合三维场景、地形、3D Tiles 等应用 */
    EngineType["Cesium"] = "cesium";
})(EngineType || (EngineType = {}));
//# sourceMappingURL=map.types.js.map