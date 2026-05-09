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
export declare function parseColor(color: string): RGBA;
/**
 * RGBA → HEX 颜色字符串
 * @description 将 RGBA 结构转换为 8 位 HEX 格式（含透明度通道）。
 *
 * @param rgba - RGBA 结构
 * @returns HEX 颜色字符串，如 '#ff0000ff'
 */
export declare function toHex(rgba: RGBA): string;
/**
 * RGBA → RGB/RGBA CSS 字符串
 * @description 根据透明度值决定输出 rgb() 还是 rgba() 格式。
 *
 * @param rgba - RGBA 结构
 * @returns CSS 颜色字符串
 */
export declare function toCssString(rgba: RGBA): string;
/**
 * 修改颜色透明度
 * @description 在给定颜色基础上修改透明度值。
 *
 * @param color - 原始颜色字符串
 * @param alpha - 新的透明度值，范围 0~1
 * @returns 新的 RGBA 颜色字符串
 */
export declare function withAlpha(color: string, alpha: number): string;
/**
 * 将颜色字符串转换为 [r, g, b, a] 数组（0~1 范围）
 * @description 用于 Cesium 等需要归一化颜色值的渲染引擎。
 *
 * @param color - 颜色字符串
 * @returns [r, g, b, a] 数组，各通道值范围 0~1
 */
export declare function toNormalizedRGBA(color: string): [number, number, number, number];
//# sourceMappingURL=color.d.ts.map