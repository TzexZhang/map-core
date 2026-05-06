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
export function calculatePolygonArea(coordinates: LngLat[]): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  let area = 0;
  const n = coordinates.length;

  if (n < 3) return 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = toRad(coordinates[i][1]);
    const lat2 = toRad(coordinates[j][1]);
    const dLng = toRad(coordinates[j][0] - coordinates[i][0]);
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs((area * R * R) / 2);
  return area;
}

/**
 * 计算折线长度（球面距离累加）
 * @description 将折线各段的大圆距离累加，得到折线总长度。
 *
 * @param coordinates - 折线坐标点数组 [[lng, lat], ...]
 * @returns 总长度（米）
 */
export function calculateLineLength(coordinates: LngLat[]): number {
  let totalLength = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalLength += distanceBetween(coordinates[i - 1], coordinates[i]);
  }
  return totalLength;
}

/**
 * 两点间球面距离（Haversine 公式）
 * @description 内部使用的距离计算辅助函数。
 *
 * @param p1 - 起点 [经度, 纬度]
 * @param p2 - 终点 [经度, 纬度]
 * @returns 距离（米）
 */
function distanceBetween(p1: LngLat, p2: LngLat): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(p2[1] - p1[1]);
  const dLng = toRad(p2[0] - p1[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1[1])) * Math.cos(toRad(p2[1])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
export function isPointInPolygon(point: LngLat, polygon: LngLat[]): boolean {
  const [x, y] = point;
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * 计算包围盒中心点
 * @description 返回由西南角和东北角定义的包围盒的几何中心点。
 *
 * @param bbox - 包围盒
 * @returns 中心点经纬度 [经度, 纬度]
 */
export function getBBoxCenter(bbox: BoundingBox): LngLat {
  return [(bbox.west + bbox.east) / 2, (bbox.south + bbox.north) / 2];
}

/**
 * 合并多个包围盒
 * @description 计算多个包围盒的并集，返回包含所有输入包围盒的最小外接矩形。
 *
 * @param bboxes - 包围盒数组
 * @returns 合并后的包围盒
 */
export function mergeBBoxes(bboxes: BoundingBox[]): BoundingBox {
  if (bboxes.length === 0) {
    return { west: -180, south: -90, east: 180, north: 90 };
  }

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const bbox of bboxes) {
    west = Math.min(west, bbox.west);
    south = Math.min(south, bbox.south);
    east = Math.max(east, bbox.east);
    north = Math.max(north, bbox.north);
  }

  return { west, south, east, north };
}

/**
 * 从 GeoJSON 要素数组中提取所有坐标点
 * @description 遍历要素的几何信息，提取所有坐标点。
 *              支持点、线、面等基本几何类型。
 *
 * @param features - GeoJSON 要素数组
 * @returns 坐标点数组 [[lng, lat], ...]
 */
export function extractCoordinates(features: GeoJSONFeature[]): LngLat[] {
  const coords: LngLat[] = [];

  for (const feature of features) {
    if (!feature.geometry?.coordinates) continue;

    const geom = feature.geometry;
    switch (geom.type) {
      case 'Point': {
        const c = geom.coordinates as number[];
        coords.push([c[0], c[1]]);
        break;
      }
      case 'LineString':
      case 'MultiPoint': {
        const cs = geom.coordinates as number[][];
        for (const c of cs) {
          coords.push([c[0], c[1]]);
        }
        break;
      }
      case 'Polygon':
      case 'MultiLineString': {
        const rings = geom.coordinates as number[][][];
        for (const ring of rings) {
          for (const c of ring) {
            coords.push([c[0], c[1]]);
          }
        }
        break;
      }
      case 'MultiPolygon': {
        const polygons = geom.coordinates as number[][][][];
        for (const polygon of polygons) {
          for (const ring of polygon) {
            for (const c of ring) {
              coords.push([c[0], c[1]]);
            }
          }
        }
        break;
      }
    }
  }

  return coords;
}

/**
 * 根据坐标点数组计算包围盒
 * @description 计算一组坐标点的最小外接矩形（包围盒）。
 *
 * @param coordinates - 坐标点数组
 * @returns 包围盒
 */
export function computeBBox(coordinates: LngLat[]): BoundingBox {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const [lng, lat] of coordinates) {
    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
  }

  return { west, south, east, north };
}
