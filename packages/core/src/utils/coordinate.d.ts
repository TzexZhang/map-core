/**
 * @file 坐标转换工具
 * @description 提供地理坐标系之间的转换方法。
 *              SDK 统一使用 WGS84（EPSG:4326）经纬度作为外部接口标准，
 *              内部根据引擎需要转换为对应投影坐标系。
 * @module MapCore.Utils.Coordinate
 */
import type { LngLat } from '../types';
/**
 * 地球半长轴半径（WGS84，单位：米）
 * @description 用于经纬度与墨卡托投影之间的距离计算
 */
declare const EARTH_RADIUS = 6378137;
/**
 * 墨卡托投影最大范围（米）
 * @description Web Mercator (EPSG:3857) 的坐标范围边界值
 */
declare const MAX_MERCATOR = 20037508.342789244;
/**
 * WGS84 经纬度（EPSG:4326）→ Web Mercator（EPSG:3857）
 * @description 将 WGS84 经纬度坐标转换为 Web 墨卡托投影坐标（单位：米）。
 *              OpenLayers 默认使用 EPSG:3857，因此需要此转换。
 *
 * @param lngLat - WGS84 经纬度坐标 [经度, 纬度]
 * @returns Web Mercator 投影坐标 [x(米), y(米)]
 *
 * @example
 * ```typescript
 * const mercator = lngLatToMercator([116.397428, 39.90923]);
 * // 结果: [12958175.4, 4852834.1]（约值）
 * ```
 */
export declare function lngLatToMercator(lngLat: LngLat): [number, number];
/**
 * Web Mercator（EPSG:3857）→ WGS84 经纬度（EPSG:4326）
 * @description 将 Web 墨卡托投影坐标转换回 WGS84 经纬度。
 *
 * @param mercator - Web Mercator 投影坐标 [x(米), y(米)]
 * @returns WGS84 经纬度坐标 [经度, 纬度]
 *
 * @example
 * ```typescript
 * const lngLat = mercatorToLngLat([12958175.4, 4852834.1]);
 * // 结果: [116.397428, 39.90923]（约值）
 * ```
 */
export declare function mercatorToLngLat(mercator: [number, number]): LngLat;
/**
 * 经纬度有效性校验
 * @description 检查给定的经纬度值是否在合理范围内。
 *
 * @param lngLat - 待校验的经纬度坐标
 * @returns true 表示有效，false 表示无效
 */
export declare function isValidLngLat(lngLat: LngLat): boolean;
/**
 * 两点间距离计算（Haversine 公式）
 * @description 使用 Haversine 公式计算两个 WGS84 经纬度点之间的大圆距离。
 *              结果单位为米，适用于中短距离计算。
 *
 * @param p1 - 第一个点的经纬度 [经度, 纬度]
 * @param p2 - 第二个点的经纬度 [经度, 纬度]
 * @returns 两点间距离（米）
 *
 * @example
 * ```typescript
 * const dist = distance([116.397, 39.909], [121.473, 31.230]);
 * // 结果约: 1067000（米，约 1067 公里）
 * ```
 */
export declare function distance(p1: LngLat, p2: LngLat): number;
/**
 * 计算两点之间的方位角（初始方位角）
 * @description 从 p1 到 p2 的初始方位角（顺时针，正北为 0 度）。
 *
 * @param p1 - 起点经纬度
 * @param p2 - 终点经纬度
 * @returns 方位角（度），范围 0~360
 */
export declare function bearing(p1: LngLat, p2: LngLat): number;
/**
 * Web Mercator 最大范围常量
 * @description 供外部模块使用，如判断坐标是否在投影范围内。
 */
export { MAX_MERCATOR, EARTH_RADIUS };
//# sourceMappingURL=coordinate.d.ts.map
