/**
 * @file 几何计算工具
 * @description 提供地理几何计算方法，包括面积计算、包围盒操作、
 *              点是否在多边形内判断等常用的 GIS 几何运算。
 * @module MapCore.Utils.Geometry
 */
import type { LngLat, BoundingBox, GeoJSONFeature } from '../types';
/**
 * 计算多边形面积（球面近似）
 * @description 使用球面多边形面积公式计算由经纬度点组成的多边形面积。
 *              适用于中小尺度多边形，大尺度多边形可能有较大误差。
 *
 * @param coordinates - 多边形外环坐标点数组 [[lng, lat], ...]
 * @returns 面积值（平方米）
 *
 * @example
 * ```typescript
 * const area = calculatePolygonArea([
 *   [116.3, 39.9], [116.4, 39.9], [116.4, 40.0], [116.3, 40.0], [116.3, 39.9]
 * ]);
 * ```
 */
export declare function calculatePolygonArea(coordinates: LngLat[]): number;
/**
 * 计算折线长度（球面距离累加）
 * @description 将折线各段的大圆距离累加，得到折线总长度。
 *
 * @param coordinates - 折线坐标点数组 [[lng, lat], ...]
 * @returns 总长度（米）
 */
export declare function calculateLineLength(coordinates: LngLat[]): number;
/**
 * 判断点是否在多边形内部（射线法）
 * @description 使用射线投射算法（Ray Casting）判断一个点是否在多边形内部。
 *              从该点向右发射一条水平射线，统计与多边形边的交点数，
 *              奇数个交点表示在内部，偶数个表示在外部。
 *
 * @param point - 待判断的点 [经度, 纬度]
 * @param polygon - 多边形外环坐标点数组
 * @returns true 表示在多边形内部，false 表示在外部
 *
 * @example
 * ```typescript
 * const inside = isPointInPolygon(
 *   [116.4, 39.9],
 *   [[116.3, 39.8], [116.5, 39.8], [116.5, 40.0], [116.3, 40.0], [116.3, 39.8]]
 * );
 * // 结果: true
 * ```
 */
export declare function isPointInPolygon(point: LngLat, polygon: LngLat[]): boolean;
/**
 * 计算包围盒中心点
 * @description 返回由西南角和东北角定义的包围盒的几何中心点。
 *
 * @param bbox - 包围盒
 * @returns 中心点经纬度 [经度, 纬度]
 */
export declare function getBBoxCenter(bbox: BoundingBox): LngLat;
/**
 * 合并多个包围盒
 * @description 计算多个包围盒的并集，返回包含所有输入包围盒的最小外接矩形。
 *
 * @param bboxes - 包围盒数组
 * @returns 合并后的包围盒
 */
export declare function mergeBBoxes(bboxes: BoundingBox[]): BoundingBox;
/**
 * 从 GeoJSON 要素数组中提取所有坐标点
 * @description 遍历要素的几何信息，提取所有坐标点。
 *              支持点、线、面等基本几何类型。
 *
 * @param features - GeoJSON 要素数组
 * @returns 坐标点数组 [[lng, lat], ...]
 */
export declare function extractCoordinates(features: GeoJSONFeature[]): LngLat[];
/**
 * 根据坐标点数组计算包围盒
 * @description 计算一组坐标点的最小外接矩形（包围盒）。
 *
 * @param coordinates - 坐标点数组
 * @returns 包围盒
 */
export declare function computeBBox(coordinates: LngLat[]): BoundingBox;
//# sourceMappingURL=geometry.d.ts.map