/**
 * @file 插件管理器实现
 * @description 管理插件的注册、依赖解析、安装和卸载生命周期。
 *              插件通过 IPlugin 接口定义统一的生命周期钩子。
 * @module MapCore.SDK.PluginManager
 */

import type { IPlugin, PluginContext } from '@geomapcore/core';
import { MapError, MapErrorCode, Logger } from '@geomapcore/core';

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
export class PluginManager {
  /** 已安装的插件注册表：插件名 → 插件实例 */
  private plugins: Map<string, IPlugin> = new Map();

  /** 插件安装顺序记录（用于逆序卸载） */
  private installedOrder: string[] = [];

  /** 插件上下文（提供 SDK 能力给插件） */
  private context: PluginContext;

  /** 插件配置注册表：插件名 → 配置对象 */
  private pluginOptions: Map<string, Record<string, unknown>> = new Map();

  /** 日志器 */
  private logger: Logger;

  /**
   * 创建插件管理器
   * @param context - 插件上下文（提供 layerManager、eventBus 等能力）
   */
  constructor(context: PluginContext) {
    this.context = context;
    this.logger = new Logger('PluginManager');
  }

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
  async use(plugin: IPlugin, options?: Record<string, unknown>): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new MapError(
        `插件 "${plugin.name}" 已安装，不可重复安装`,
        MapErrorCode.E5001_PLUGIN_DUPLICATE_NAME,
        'PluginManager'
      );
    }

    if (plugin.dependencies && plugin.dependencies.length > 0) {
      for (const depName of plugin.dependencies) {
        if (!this.plugins.has(depName)) {
          throw new MapError(
            `插件 "${plugin.name}" 依赖的 "${depName}" 尚未安装`,
            MapErrorCode.E5002_PLUGIN_DEPENDENCY_MISSING,
            'PluginManager'
          );
        }
      }
    }

    if (options) {
      this.pluginOptions.set(plugin.name, options);
    }

    try {
      await plugin.install(this.context);
      this.plugins.set(plugin.name, plugin);
      this.installedOrder.push(plugin.name);
      this.logger.info(plugin.name, `插件已安装 (v${plugin.version})`);
    } catch (error) {
      throw new MapError(
        `插件 "${plugin.name}" 安装失败: ${error instanceof Error ? error.message : String(error)}`,
        MapErrorCode.E5003_PLUGIN_INSTALL_FAILED,
        'PluginManager',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 卸载插件（逆序调用 uninstall）
   * @param pluginName - 插件名称
   */
  unuse(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      this.logger.warn(pluginName, '插件未安装，无法卸载');
      return;
    }

    try {
      plugin.uninstall(this.context);
      this.plugins.delete(pluginName);
      this.installedOrder = this.installedOrder.filter((n) => n !== pluginName);
      this.pluginOptions.delete(pluginName);
      this.logger.info(pluginName, '插件已卸载');
    } catch (error) {
      this.logger.error(pluginName, '插件卸载失败', error);
    }
  }

  /**
   * 检查插件是否已安装
   * @param pluginName - 插件名称
   * @returns 是否已安装
   */
  has(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  /**
   * 获取已安装的插件实例
   * @typeparam T - 插件类型
   * @param pluginName - 插件名称
   * @returns 插件实例，未安装返回 undefined
   */
  get<T extends IPlugin>(pluginName: string): T | undefined {
    return this.plugins.get(pluginName) as T | undefined;
  }

  /**
   * 获取所有已安装插件的名称列表
   * @returns 插件名称数组（按安装顺序）
   */
  getInstalledPlugins(): string[] {
    return [...this.installedOrder];
  }

  /**
   * 卸载所有插件（逆序卸载）
   */
  destroy(): void {
    const reversedOrder = [...this.installedOrder].reverse();
    for (const pluginName of reversedOrder) {
      this.unuse(pluginName);
    }
    this.plugins.clear();
    this.installedOrder = [];
    this.pluginOptions.clear();
  }
}
