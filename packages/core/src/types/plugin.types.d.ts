/**
 * @file 插件类型定义
 * @description 定义插件接口、插件上下文以及插件管理相关的类型。
 *              插件是 SDK 功能的扩展单元，遵循统一的安装/卸载生命周期。
 *              业务方可将自定义逻辑封装为插件，通过 PluginManager 统一管理。
 * @module MapCore.Types.Plugin
 */
/**
 * 插件接口
 * @description 所有 SDK 插件必须实现此接口。
 *              插件通过 install() 获取 SDK 上下文并注册自身功能，
 *              通过 uninstall() 清理所有创建的资源。
 *
 * 设计原则：
 * - 插件应避免直接操作引擎底层，优先使用 SDK 提供的公共 API
 * - 插件间通信通过 EventBus 实现，避免直接引用造成耦合
 * - 插件需在 uninstall() 中清理所有创建的图层、事件监听和定时器
 */
export interface IPlugin {
  /** 插件唯一名称标识（全局唯一，不可与其他插件重复） */
  readonly name: string;
  /** 插件版本号（遵循 semver 语义化版本格式，如 "1.0.0"） */
  readonly version: string;
  /**
   * 依赖的其他插件名称列表
   * 这些插件会在本插件安装之前自动安装（如果尚未安装的话）。
   * 如果依赖的插件无法安装，则本插件的安装也会失败。
   */
  readonly dependencies?: string[];
  /**
   * 插件安装钩子
   * 在 MapController 初始化完成后或手动调用 use() 时触发。
   * 通过 ctx 参数获取 SDK 内部能力的受控访问。
   *
   * @param ctx - 插件上下文，提供图层管理、数据源管理、事件总线等能力
   */
  install(ctx: PluginContext): void | Promise<void>;
  /**
   * 插件卸载钩子
   * 在 MapController.destroy() 或手动调用 unuse() 时触发。
   * 必须清理所有插件创建的资源，包括：
   * - 添加的图层
   * - 注册的事件监听
   * - 创建的定时器
   * - 注册的数据源
   *
   * @param ctx - 插件上下文
   */
  uninstall(ctx: PluginContext): void;
}
/**
 * 插件上下文接口
 * @description 插件安装时获取的 SDK 能力上下文。
 *              提供受控的内部 API 访问，避免插件直接操作内部状态。
 */
export interface PluginContext {
  /**
   * 图层管理器
   * 允许插件添加、移除、修改地图图层
   */
  layerManager: unknown;
  /**
   * 数据源管理器
   * 允许插件注册和管理数据源
   */
  dataSourceManager: unknown;
  /**
   * 事件总线
   * 允许插件发布和订阅事件，实现插件间通信
   */
  eventBus: unknown;
  /**
   * 地图引擎接口
   * 提供视图控制、坐标转换等地图核心能力
   */
  engine: unknown;
  /**
   * SDK 日志工具
   * 建议插件使用此工具输出日志，统一管理日志级别和输出
   */
  logger: unknown;
  /**
   * 获取当前插件的配置选项
   * 即注册插件时传入的 options 参数
   * @typeparam T - 配置的类型定义
   * @returns 插件配置对象
   */
  getOptions<T = Record<string, unknown>>(): T;
}
//# sourceMappingURL=plugin.types.d.ts.map
