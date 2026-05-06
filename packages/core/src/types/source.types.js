/**
 * @file 数据源类型定义
 * @description 定义数据源类型枚举、各数据源的配置接口（HTTP / WebSocket / 静态 / Mock）。
 *              数据源负责数据获取，与图层渲染解耦。
 *              数据源通过 DataSourceManager 统一管理生命周期。
 * @module MapCore.Types.Source
 */
/**
 * 数据源类型枚举
 * @description 定义 SDK 支持的所有数据获取方式。
 */
export var DataSourceType;
(function (DataSourceType) {
    /** HTTP/HTTPS 单次请求或轮询（最常用的数据获取方式） */
    DataSourceType["HTTP"] = "http";
    /** WebSocket 长连接实时数据流（适用于实时目标追踪等场景） */
    DataSourceType["WebSocket"] = "websocket";
    /** 本地静态数据（直接传入 GeoJSON 数据，无需网络请求） */
    DataSourceType["Static"] = "static";
    /** Mock 模拟数据（仅开发/联调使用，可模拟延迟和错误） */
    DataSourceType["Mock"] = "mock";
})(DataSourceType || (DataSourceType = {}));
//# sourceMappingURL=source.types.js.map