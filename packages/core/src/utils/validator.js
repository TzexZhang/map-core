/**
 * @file 参数校验工具
 * @description 提供 SDK 公共 API 的参数校验方法。
 *              所有外部输入在进入业务逻辑前必须经过校验。
 *              校验失败抛出 MapError，携带明确的错误描述。
 * @module MapCore.Utils.Validator
 */
/**
 * 校验字符串非空
 * @description 检查给定值是否为非空字符串。
 *
 * @param value - 待校验的值
 * @param paramName - 参数名称（用于错误消息）
 * @throws 当值为空或非字符串时抛出 Error
 */
export function assertNonEmptyString(value, paramName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`参数校验失败: ${paramName} 必须是非空字符串`);
    }
}
/**
 * 校验数值范围
 * @description 检查给定值是否为有限数字且在指定范围内。
 *
 * @param value - 待校验的值
 * @param paramName - 参数名称
 * @param min - 最小值（包含）
 * @param max - 最大值（包含）
 * @throws 当值不是有限数字或超出范围时抛出 Error
 */
export function assertNumberInRange(value, paramName, min = -Infinity, max = Infinity) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        throw new Error(`参数校验失败: ${paramName} 必须是 ${min}~${max} 之间的有效数字，实际值: ${value}`);
    }
}
/**
 * 校验对象非 null/undefined
 * @description 检查给定值是否为有效对象（非 null 且非 undefined）。
 *
 * @param value - 待校验的值
 * @param paramName - 参数名称
 * @throws 当值为 null 或 undefined 时抛出 Error
 */
export function assertDefined(value, paramName) {
    if (value === null || value === undefined) {
        throw new Error(`参数校验失败: ${paramName} 不能为 null 或 undefined`);
    }
}
/**
 * 校验 ID 唯一性
 * @description 检查给定 ID 是否在已有 ID 集合中重复。
 *
 * @param id - 待校验的 ID
 * @param existingIds - 已有 ID 集合
 * @param resourceType - 资源类型名称（用于错误消息）
 * @throws 当 ID 已存在时抛出 Error
 */
export function assertUniqueId(id, existingIds, resourceType) {
    if (existingIds.has(id)) {
        throw new Error(`参数校验失败: ${resourceType} ID "${id}" 已存在，不可重复`);
    }
}
/**
 * 校验经纬度坐标有效性
 * @description 检查经纬度元组是否在有效范围内。
 *
 * @param lngLat - 经纬度坐标 [经度, 纬度]
 * @param paramName - 参数名称
 * @throws 当坐标无效时抛出 Error
 */
export function assertValidLngLat(lngLat, paramName) {
    if (!Array.isArray(lngLat) ||
        lngLat.length < 2 ||
        typeof lngLat[0] !== 'number' ||
        typeof lngLat[1] !== 'number' ||
        lngLat[0] < -180 ||
        lngLat[0] > 180 ||
        lngLat[1] < -90 ||
        lngLat[1] > 90) {
        throw new Error(`参数校验失败: ${paramName} 必须是有效的经纬度坐标 [经度(-180~180), 纬度(-90~90)]`);
    }
}
/**
 * 校验 DOM 容器元素有效性
 * @description 检查传入的容器参数是否可以解析为有效的 DOM 元素。
 *
 * @param container - DOM 元素或元素 ID 字符串
 * @returns 解析后的 DOM 元素
 * @throws 当容器无效或不存在时抛出 Error
 */
export function resolveContainer(container) {
    let element;
    if (typeof container === 'string') {
        element = document.getElementById(container);
        if (!element) {
            throw new Error(`参数校验失败: 未找到 ID 为 "${container}" 的 DOM 元素`);
        }
    }
    else if (container instanceof HTMLElement) {
        element = container;
    }
    else {
        throw new Error('参数校验失败: container 必须是 HTMLElement 或有效的元素 ID 字符串');
    }
    return element;
}
/**
 * 校验枚举值有效性
 * @description 检查给定值是否是目标枚举的有效成员。
 *
 * @param value - 待校验的值
 * @param enumObj - 枚举对象
 * @param paramName - 参数名称
 * @throws 当值不是枚举成员时抛出 Error
 */
export function assertEnumValue(value, enumObj, paramName) {
    const validValues = Object.values(enumObj);
    if (!validValues.includes(value)) {
        throw new Error(`参数校验失败: ${paramName} 必须是 [${validValues.join(', ')}] 之一，实际值: ${value}`);
    }
}
//# sourceMappingURL=validator.js.map