/**
 * @file 工具函数统一导出入口
 * @module MapCore.Utils
 */
export {
  lngLatToMercator,
  mercatorToLngLat,
  isValidLngLat,
  distance,
  bearing,
  MAX_MERCATOR,
  EARTH_RADIUS,
} from './coordinate';
export {
  calculatePolygonArea,
  calculateLineLength,
  isPointInPolygon,
  getBBoxCenter,
  mergeBBoxes,
  extractCoordinates,
  computeBBox,
} from './geometry';
export { parseColor, toHex, toCssString, withAlpha, toNormalizedRGBA } from './color';
export type { RGBA } from './color';
export { Logger, LogLevel, createChildLogger } from './logger';
export {
  assertNonEmptyString,
  assertNumberInRange,
  assertDefined,
  assertUniqueId,
  assertValidLngLat,
  resolveContainer,
  assertEnumValue,
} from './validator';
//# sourceMappingURL=index.d.ts.map
