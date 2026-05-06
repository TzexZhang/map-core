/**
 * @file 事件类型定义
 * @description 定义 SDK 中所有事件的名称常量及事件载荷类型。
 *              事件分为四大类：地图交互事件、要素交互事件、图层事件、数据源事件和系统事件。
 *              业务方通过 map.on() 监听，内部通过 EventBus.emit() 触发。
 * @module MapCore.Types.Event
 */
/**
 * 所有事件名称常量对象
 * @description 使用常量对象而非魔法字符串，避免拼写错误，便于重构和搜索。
 *              事件名格式为 "域:动作"，如 "map:click"、"layer:add"。
 */
export const MapEvents = {
    // ==================== 地图交互事件 ====================
    /** 地图单击事件，携带点击位置的经纬度和屏幕坐标 */
    MAP_CLICK: 'map:click',
    /** 地图双击事件 */
    MAP_DBLCLICK: 'map:dblclick',
    /** 鼠标/触摸移动事件（高频触发，谨慎监听） */
    MAP_POINTERMOVE: 'map:pointermove',
    /** 地图视图变化完成事件（平移、缩放、旋转后触发） */
    MAP_MOVEEND: 'map:moveend',
    /** 地图视图变化中事件（高频，实时跟踪视图变化） */
    MAP_MOVE: 'map:move',
    /** 地图右键菜单事件 */
    MAP_CONTEXTMENU: 'map:contextmenu',
    // ==================== 要素交互事件 ====================
    /** 要素被点击选中事件 */
    FEATURE_CLICK: 'feature:click',
    /** 鼠标悬停在要素上事件 */
    FEATURE_HOVER: 'feature:hover',
    /** 鼠标离开要素事件 */
    FEATURE_LEAVE: 'feature:leave',
    // ==================== 图层事件 ====================
    /** 图层添加完成事件 */
    LAYER_ADD: 'layer:add',
    /** 图层移除完成事件 */
    LAYER_REMOVE: 'layer:remove',
    /** 图层可见性变化事件 */
    LAYER_VISIBILITY_CHANGE: 'layer:visibility',
    /** 图层数据加载完成事件 */
    LAYER_LOAD: 'layer:load',
    /** 图层数据加载失败事件 */
    LAYER_ERROR: 'layer:error',
    // ==================== 数据源事件 ====================
    /** 数据源数据更新事件 */
    DATASOURCE_UPDATE: 'datasource:update',
    /** WebSocket 连接成功事件 */
    DATASOURCE_CONNECTED: 'datasource:connected',
    /** WebSocket 断开连接事件 */
    DATASOURCE_DISCONNECTED: 'datasource:disconnected',
    /** 数据源请求错误事件 */
    DATASOURCE_ERROR: 'datasource:error',
    // ==================== 系统事件 ====================
    /** SDK 初始化完成事件 */
    READY: 'system:ready',
    /** SDK 销毁完成事件 */
    DESTROY: 'system:destroy',
    /** 渲染引擎切换完成事件（2D ↔ 3D） */
    ENGINE_SWITCH: 'system:engine_switch',
};
//# sourceMappingURL=event.types.js.map