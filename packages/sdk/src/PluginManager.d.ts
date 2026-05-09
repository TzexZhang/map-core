/**
 * @file 插件管理器实现
 * @description 管理插件的注册、依赖解析、安装和卸载生命周期。
 *              插件通过 IPlugin 接口定义统一的生命周期钩子。
 * @module MapCore.SDK.PluginManager
 */
import type { IPlugin, PluginContext } from '@mapcore/core';
/**
 * 插件管理器
 * @description 负责 SDK 插件的完整生命周期管理。
 *
 * 核心职责：
 * 1. 插件注册与唯一性校验
 * 2. 依赖拓扑排序（确保依赖插件先安装）
 * 3. 按顺序调用 install() 和 uninstall()
 * 4. 插件查询和状态管理
 *
 * @example
 * ```typescript
 * const pm = new PluginManager(pluginContext);
 * await pm.use(myPlugin, { option1: 'value' });
 * pm.has('myPlugin'); // true
 * pm.unuse('myPlugin');
 * ```
 */
export declare class PluginManager {
    /** 已安装的插件注册表：插件名 → 插件实例 */
    private plugins;
    /** 插件安装顺序记录（用于逆序卸载） */
    private installedOrder;
    /** 插件上下文（提供 SDK 能力给插件） */
    private context;
    /** 插件配置注册表：插件名 → 配置对象 */
    private pluginOptions;
    /** 日志器 */
    private logger;
    /**
     * 创建插件管理器
     * @param context - 插件上下文（提供 layerManager、eventBus 等能力）
     */
    constructor(context: PluginContext);
    /**
     * 注册并安装插件
     * @description 执行流程：
     * 1. 检查插件名唯一性
     * 2. 解析依赖顺序（拓扑排序）
     * 3. 按顺序调用各插件的 install(ctx) 方法
     *
     * @param plugin - 插件实例
     * @param options - 插件配置（可通过 ctx.getOptions() 获取）
     * @throws 插件名重复或依赖缺失时抛出错误
     */
    use(plugin: IPlugin, options?: Record<string, unknown>): Promise<void>;
    /**
     * 卸载插件（逆序调用 uninstall）
     * @param pluginName - 插件名称
     */
    unuse(pluginName: string): void;
    /**
     * 检查插件是否已安装
     * @param pluginName - 插件名称
     * @returns 是否已安装
     */
    has(pluginName: string): boolean;
    /**
     * 获取已安装的插件实例
     * @typeparam T - 插件类型
     * @param pluginName - 插件名称
     * @returns 插件实例，未安装返回 undefined
     */
    get<T extends IPlugin>(pluginName: string): T | undefined;
    /**
     * 获取所有已安装插件的名称列表
     * @returns 插件名称数组（按安装顺序）
     */
    getInstalledPlugins(): string[];
    /**
     * 卸载所有插件（逆序卸载）
     */
    destroy(): void;
}
//# sourceMappingURL=PluginManager.d.ts.map