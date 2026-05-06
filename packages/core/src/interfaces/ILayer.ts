/**
 * @file 图层接口定义
 * @description 定义图层操作的标准接口（ILayer）和图层管理器接口（ILayerManager）。
 *              图层是地图上可独立管理的渲染单元，所有图层操作通过这些接口进行。
 * @module MapCore.Interfaces.ILayer
 */

import type { LayerConfig, LayerState, GeoJSONFeatureCollection } from '../types';

/**
 * 图层接口
 * @description 单个图层的标准操作接口。
 *              每种具体图层类型（瓦片/矢量/热力图等）均实现此接口。
 */
export interface ILayer {
  /** 图层唯一标识 ID */
  readonly id: string;
  /** 图层类型 */
  readonly type: string;
  /** 图层显示名称 */
  readonly name: string;

  /**
   * 设置图层可见性
   * @param visible - true 显示图层，false 隐藏图层
   */
  setVisible(visible: boolean): void;

  /**
   * 获取图层当前可见性
   * @returns 当前可见状态
   */
  getVisible(): boolean;

  /**
   * 设置图层透明度
   * @param opacity - 透明度值 0~1
   */
  setOpacity(opacity: number): void;

  /**
   * 获取图层当前透明度
   * @returns 当前透明度值
   */
  getOpacity(): number;

  /**
   * 设置图层 z-index（叠加顺序）
   * @param zIndex - z-index 值，数值越大越靠上
   */
  setZIndex(zIndex: number): void;

  /**
   * 更新图层数据（仅矢量图层有效）
   * @param data - 新的 GeoJSON 要素集合
   */
  updateData(data: GeoJSONFeatureCollection): void;

  /**
   * 获取图层当前加载状态
   * @returns 加载状态：idle / loading / loaded / error
   */
  getLoadStatus(): 'idle' | 'loading' | 'loaded' | 'error';

  /**
   * 销毁图层，释放所有资源
   */
  destroy(): void;
}

/**
 * 图层管理器接口
 * @description 提供图层的增删改查、分组管理和状态导出等能力。
 */
export interface ILayerManager {
  /**
   * 添加图层到地图
   * @param config - 图层配置
   * @param groupId - 可选的分组 ID，用于按业务分组管理图层
   * @returns 图层 ID
   */
  addLayer(config: LayerConfig, groupId?: string): string;

  /**
   * 批量添加图层
   * @param configs - 图层配置数组
   * @param groupId - 可选的分组 ID
   * @returns 图层 ID 数组
   */
  addLayers(configs: LayerConfig[], groupId?: string): string[];

  /**
   * 移除指定图层
   * @param layerId - 图层 ID
   */
  removeLayer(layerId: string): void;

  /**
   * 设置图层可见性
   * @param layerId - 图层 ID
   * @param visible - 可见性
   */
  setLayerVisible(layerId: string, visible: boolean): void;

  /**
   * 设置图层透明度
   * @param layerId - 图层 ID
   * @param opacity - 透明度 0~1
   */
  setLayerOpacity(layerId: string, opacity: number): void;

  /**
   * 按分组设置图层可见性
   * @param groupId - 分组 ID
   * @param visible - 可见性
   */
  setGroupVisible(groupId: string, visible: boolean): void;

  /**
   * 获取指定图层状态
   * @param layerId - 图层 ID
   * @returns 图层状态，不存在返回 undefined
   */
  getLayerState(layerId: string): LayerState | undefined;

  /**
   * 获取所有图层状态快照
   * @returns 所有图层的运行时状态数组
   */
  getLayerStates(): LayerState[];

  /**
   * 导出当前所有图层配置（用于状态持久化和恢复）
   * @returns 图层配置数组
   */
  exportConfigs(): LayerConfig[];

  /**
   * 从配置数组恢复图层（清空现有图层后批量导入）
   * @param configs - 图层配置数组
   */
  importConfigs(configs: LayerConfig[]): void;

  /**
   * 销毁图层管理器，移除所有图层
   */
  destroy(): void;
}
