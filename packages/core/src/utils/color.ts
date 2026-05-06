/**
 * @file 颜色处理工具
 * @description 提供 CSS 颜色字符串的解析、转换和操作方法。
 *              支持 HEX、RGB、RGBA 格式的颜色字符串。
 *              用于矢量图层样式渲染时的颜色处理。
 * @module MapCore.Utils.Color
 */

/**
 * RGBA 颜色结构
 * @description 将颜色解析为 RGBA 四通道结构，便于计算和转换。
 */
export interface RGBA {
  /** 红色通道值，范围 0~255 */
  r: number;
  /** 绿色通道值，范围 0~255 */
  g: number;
  /** 蓝色通道值，范围 0~255 */
  b: number;
  /** 透明度，范围 0~1 */
  a: number;
}

/**
 * 解析颜色字符串为 RGBA 结构
 * @description 支持以下格式：
 * - HEX: '#ff0000', '#f00', '#ff0000ff'
 * - RGB: 'rgb(255, 0, 0)'
 * - RGBA: 'rgba(255, 0, 0, 0.5)'
 *
 * @param color - 颜色字符串
 * @returns RGBA 结构
 * @throws 无法识别的颜色格式时抛出错误
 *
 * @example
 * ```typescript
 * parseColor('#ff0000');     // { r: 255, g: 0, b: 0, a: 1 }
 * parseColor('rgba(0,0,255,0.5)'); // { r: 0, g: 0, b: 255, a: 0.5 }
 * ```
 */
export function parseColor(color: string): RGBA {
  const trimmed = color.trim().toLowerCase();

  if (trimmed.startsWith('#')) {
    return parseHex(trimmed);
  }

  if (trimmed.startsWith('rgba(')) {
    return parseRgba(trimmed);
  }

  if (trimmed.startsWith('rgb(')) {
    return parseRgb(trimmed);
  }

  return namedColorToRgba(trimmed);
}

/**
 * HEX 颜色字符串 → RGBA
 * @description 支持 3 位 (#f00)、6 位 (#ff0000) 和 8 位 (#ff0000ff) HEX 格式。
 *
 * @param hex - HEX 颜色字符串
 * @returns RGBA 结构
 */
function parseHex(hex: string): RGBA {
  let h = hex.slice(1);

  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}

/**
 * RGB 颜色字符串 → RGBA
 * @param rgb - 'rgb(r, g, b)' 格式的字符串
 * @returns RGBA 结构（alpha 固定为 1）
 */
function parseRgb(rgb: string): RGBA {
  const values = rgb.match(/\d+/g);
  if (!values || values.length < 3) {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  return {
    r: parseInt(values[0], 10),
    g: parseInt(values[1], 10),
    b: parseInt(values[2], 10),
    a: 1,
  };
}

/**
 * RGBA 颜色字符串 → RGBA
 * @param rgba - 'rgba(r, g, b, a)' 格式的字符串
 * @returns RGBA 结构
 */
function parseRgba(rgba: string): RGBA {
  const values = rgba.match(/[\d.]+/g);
  if (!values || values.length < 4) {
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  return {
    r: parseInt(values[0], 10),
    g: parseInt(values[1], 10),
    b: parseInt(values[2], 10),
    a: parseFloat(values[3]),
  };
}

/**
 * 常见 CSS 命名颜色转 RGBA
 * @param name - 颜色名称（如 'red', 'blue', 'green'）
 * @returns RGBA 结构
 */
function namedColorToRgba(name: string): RGBA {
  const namedColors: Record<string, string> = {
    red: '#ff0000',
    green: '#008000',
    blue: '#0000ff',
    white: '#ffffff',
    black: '#000000',
    yellow: '#ffff00',
    orange: '#ffa500',
    purple: '#800080',
    gray: '#808080',
    grey: '#808080',
    transparent: '#00000000',
  };
  const hex = namedColors[name] ?? '#000000';
  return parseHex(hex);
}

/**
 * RGBA → HEX 颜色字符串
 * @description 将 RGBA 结构转换为 8 位 HEX 格式（含透明度通道）。
 *
 * @param rgba - RGBA 结构
 * @returns HEX 颜色字符串，如 '#ff0000ff'
 */
export function toHex(rgba: RGBA): string {
  const r = rgba.r.toString(16).padStart(2, '0');
  const g = rgba.g.toString(16).padStart(2, '0');
  const b = rgba.b.toString(16).padStart(2, '0');
  const a = Math.round(rgba.a * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${r}${g}${b}${a}`;
}

/**
 * RGBA → RGB/RGBA CSS 字符串
 * @description 根据透明度值决定输出 rgb() 还是 rgba() 格式。
 *
 * @param rgba - RGBA 结构
 * @returns CSS 颜色字符串
 */
export function toCssString(rgba: RGBA): string {
  if (rgba.a < 1) {
    return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
  }
  return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
}

/**
 * 修改颜色透明度
 * @description 在给定颜色基础上修改透明度值。
 *
 * @param color - 原始颜色字符串
 * @param alpha - 新的透明度值，范围 0~1
 * @returns 新的 RGBA 颜色字符串
 */
export function withAlpha(color: string, alpha: number): string {
  const rgba = parseColor(color);
  rgba.a = Math.max(0, Math.min(1, alpha));
  return toCssString(rgba);
}

/**
 * 将颜色字符串转换为 [r, g, b, a] 数组（0~1 范围）
 * @description 用于 Cesium 等需要归一化颜色值的渲染引擎。
 *
 * @param color - 颜色字符串
 * @returns [r, g, b, a] 数组，各通道值范围 0~1
 */
export function toNormalizedRGBA(color: string): [number, number, number, number] {
  const rgba = parseColor(color);
  return [rgba.r / 255, rgba.g / 255, rgba.b / 255, rgba.a];
}
