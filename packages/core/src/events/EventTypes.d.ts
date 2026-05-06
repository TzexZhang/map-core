/**
 * @file 事件名称常量定义
 * @description 集中定义 SDK 中使用的所有事件名称常量。
 *              使用常量而非字符串字面量，避免拼写错误，便于全局搜索和重构。
 *              此文件是 types/event.types.ts 中 MapEvents 的补充，
 *              可在非 TypeScript 环境中独立使用。
 * @module MapCore.Events.EventTypes
 */
/**
 * 事件名称常量集合
 * @description 所有事件名称统一在此定义，格式为 "域:动作"。
 *              各模块触发和监听事件时必须使用这些常量。
 */
export declare const EventTypes: {
  /** 地图单击事件名称 */
  readonly MAP_CLICK: 'map:click';
  /** 地图双击事件名称 */
  readonly MAP_DBLCLICK: 'map:dblclick';
  /** 鼠标/触摸移动事件名称 */
  readonly MAP_POINTERMOVE: 'map:pointermove';
  /** 地图视图变化完成事件名称 */
  readonly MAP_MOVEEND: 'map:moveend';
  /** 地图视图变化中事件名称 */
  readonly MAP_MOVE: 'map:move';
  /** 地图右键菜单事件名称 */
  readonly MAP_CONTEXTMENU: 'map:contextmenu';
  /** 要素点击选中事件名称 */
  readonly FEATURE_CLICK: 'feature:click';
  /** 要素悬停事件名称 */
  readonly FEATURE_HOVER: 'feature:hover';
  /** 要素离开事件名称 */
  readonly FEATURE_LEAVE: 'feature:leave';
  /** 图层添加事件名称 */
  readonly LAYER_ADD: 'layer:add';
  /** 图层移除事件名称 */
  readonly LAYER_REMOVE: 'layer:remove';
  /** 图层可见性变化事件名称 */
  readonly LAYER_VISIBILITY_CHANGE: 'layer:visibility';
  /** 图层数据加载完成事件名称 */
  readonly LAYER_LOAD: 'layer:load';
  /** 图层数据加载失败事件名称 */
  readonly LAYER_ERROR: 'layer:error';
  /** 数据源数据更新事件名称 */
  readonly DATASOURCE_UPDATE: 'datasource:update';
  /** WebSocket 连接成功事件名称 */
  readonly DATASOURCE_CONNECTED: 'datasource:connected';
  /** WebSocket 断开连接事件名称 */
  readonly DATASOURCE_DISCONNECTED: 'datasource:disconnected';
  /** 数据源请求错误事件名称 */
  readonly DATASOURCE_ERROR: 'datasource:error';
  /** SDK 初始化完成事件名称 */
  readonly READY: 'system:ready';
  /** SDK 销毁完成事件名称 */
  readonly DESTROY: 'system:destroy';
  /** 引擎切换完成事件名称 */
  readonly ENGINE_SWITCH: 'system:engine_switch';
};
//# sourceMappingURL=EventTypes.d.ts.map
