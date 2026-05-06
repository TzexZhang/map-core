/**
 * @file 图层相关类型定义
 * @description 定义地图图层的类型枚举、各类图层的配置接口、
 *              矢量要素样式配置以及图层运行时状态等类型。
 *              图层是地图上可独立管理的渲染单元，通过 LayerManager 统一管理。
 * @module MapCore.Types.Layer
 */
/**
 * 图层类型枚举
 * @description 定义 SDK 支持的所有图层类型。
 *              不同类型对应不同的数据格式和渲染方式。
 */
export var LayerType;
(function (LayerType) {
    /** 栅格瓦片图层（XYZ / TMS 格式的标准瓦片服务） */
    LayerType["Tile"] = "tile";
    /** OGC WMS 服务图层（Web Map Service） */
    LayerType["WMS"] = "wms";
    /** OGC WMTS 服务图层（Web Map Tile Service） */
    LayerType["WMTS"] = "wmts";
    /** 矢量要素图层（GeoJSON / WFS 格式的矢量数据） */
    LayerType["Vector"] = "vector";
    /** 热力图图层（基于点密度渲染的热力可视化） */
    LayerType["Heatmap"] = "heatmap";
    /** 聚合点图层（大量点要素按距离聚合显示） */
    LayerType["Cluster"] = "cluster";
    /** Cesium 3D Tiles 图层（三维模型瓦片，如建筑、地形） */
    LayerType["Tileset3D"] = "tileset3d";
    /** 地形服务图层（DEM 高程数据，仅 Cesium 3D） */
    LayerType["Terrain"] = "terrain";
    /** CZML 动态数据图层（Cesium 专用的时序动态数据格式） */
    LayerType["CZML"] = "czml";
    /** 自定义图层（业务通过插件扩展的特殊图层类型） */
    LayerType["Custom"] = "custom";
})(LayerType || (LayerType = {}));
//# sourceMappingURL=layer.types.js.map