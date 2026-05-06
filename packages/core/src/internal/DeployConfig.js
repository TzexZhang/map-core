/**
 * @file 内部部署配置模块
 * @description 管理 SDK 项目内部使用的资源地址和代理配置。
 *              此模块仅供 SDK 项目内部使用，外部调用方不可更改部署相关配置。
 *              支持内网部署、离线瓦片、Cesium 资源本地化等场景。
 *
 * 瓦片资源动态配置机制：
 *   瓦片 URL 支持占位符语法 `{{env:KEY}}`，在构建时由 Vite/Webpack
 *   将 .env 文件中的环境变量注入到产物中，运行时自动替换为实际地址。
 *   .env 是 **SDK 项目自身**的配置文件，不是外部调用方传入的。
 *
 * @module MapCore.Internal.DeployConfig
 */
/**
 * URL 占位符正则表达式
 * @description 匹配 {{env:KEY}} 格式的占位符。
 *              示例：{{env:TILE_BASE}} → 替换为 envMap 中 TILE_BASE 对应的值
 */
const ENV_PLACEHOLDER_REGEX = /\{\{env:(\w+)\}\}/g;
/**
 * 简化占位符正则表达式
 * @description 匹配 {{KEY}} 格式的简化占位符（不含 env: 前缀）。
 *              示例：{{tileBase}} → 替换为 ProxyConfig.tileServiceBase
 */
const SIMPLE_PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;
/**
 * 内置占位符名称与 ProxyConfig 字段的映射
 * @description 支持在瓦片 URL 中使用简化的内置占位符。
 */
const BUILTIN_PLACEHOLDERS = {
    tileBase: 'tileServiceBase',
    terrainUrl: 'terrainServiceUrl',
    cesiumBaseUrl: 'cesiumBaseUrl',
};
/**
 * 部署配置管理器
 * @description 单例模式，管理 SDK 内部部署配置。
 *              - 配置来源优先级：显式设置 > 环境变量 > 默认值
 *              - 外部无法访问或修改此配置
 *              - 瓦片 URL 支持动态占位符替换
 */
export class DeployConfigManager {
    /**
     * 创建部署配置管理器
     * @param config - 初始配置
     */
    constructor(config) {
        /** 环境变量映射缓存（合并了环境变量和自定义映射） */
        this.resolvedEnvMap = {};
        /** 是否已初始化 */
        this.initialized = false;
        this.config = this.mergeWithDefaults(config ?? {});
        this.resolvedEnvMap = config?.envMap ?? {};
    }
    /**
     * 初始化部署配置
     * @description 从环境变量加载所有 MAPCORE_ 前缀的变量到 envMap。
     *              同时加载 .env 文件中的配置（由构建工具自动注入）。
     *              仅在 MapController.create() 内部调用一次。
     *
     * @param config - 内部传入的代理配置
     */
    init(config) {
        if (this.initialized)
            return;
        this.config = this.mergeWithDefaults(config ?? {});
        this.resolvedEnvMap = { ...config?.envMap };
        this.loadFromProcessEnv();
        this.loadFromImportMetaEnv();
        this.initialized = true;
    }
    /**
     * 解析 URL 中的占位符
     * @description 将瓦片 URL 中的占位符替换为环境变量中的实际值。
     *              支持两种格式：
     *              - `{{env:KEY}}`：从 envMap 中查找 KEY 对应的值
     *              - `{{tileBase}}`、`{{terrainUrl}}`：内置占位符
     *
     * @param url - 原始 URL（可能包含占位符）
     * @returns 替换后的实际 URL
     *
     * @example
     * ```typescript
     * // .env: MAPCORE_TILE_BASE=http://192.168.1.100:8080/tiles/{z}/{x}/{y}.png
     * resolveUrl('{{env:TILE_BASE}}')
     * // → 'http://192.168.1.100:8080/tiles/{z}/{x}/{y}.png'
     *
     * resolveUrl('{{tileBase}}')
     * // → ProxyConfig.tileServiceBase 的值
     * ```
     */
    resolveUrl(url) {
        if (!url)
            return url;
        let resolved = url;
        // 替换 {{env:KEY}} 格式
        resolved = resolved.replace(ENV_PLACEHOLDER_REGEX, (_match, key) => {
            return this.resolvedEnvMap[key] ?? _match;
        });
        // 替换 {{KEY}} 格式（内置占位符）
        resolved = resolved.replace(SIMPLE_PLACEHOLDER_REGEX, (_match, key) => {
            // 先检查 envMap 中是否有直接对应的 key
            if (this.resolvedEnvMap[key]) {
                return this.resolvedEnvMap[key];
            }
            // 再检查内置占位符映射
            const configField = BUILTIN_PLACEHOLDERS[key];
            if (configField) {
                const value = this.config[configField];
                if (typeof value === 'string')
                    return value;
            }
            return _match;
        });
        return resolved;
    }
    /**
     * 获取瓦片服务地址
     */
    getTileServiceBase() {
        return this.config.tileServiceBase;
    }
    /**
     * 获取 Cesium Ion 服务地址
     */
    getCesiumIonServer() {
        return this.config.cesiumIonServer;
    }
    /**
     * 获取地形服务地址
     */
    getTerrainServiceUrl() {
        return this.config.terrainServiceUrl;
    }
    /**
     * 获取 Cesium 静态资源路径
     */
    getCesiumBaseUrl() {
        return this.config.cesiumBaseUrl;
    }
    /**
     * 获取完整配置快照（只读）
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 从 Node.js process.env 加载 MAPCORE_ 前缀的环境变量
     * @description 将 MAPCORE_TILE_BASE 等变量自动映射到 envMap 和对应配置字段。
     */
    loadFromProcessEnv() {
        const globalEnv = globalThis.process;
        if (!globalEnv || typeof globalEnv !== 'object')
            return;
        const proc = globalEnv;
        if (!proc.env)
            return;
        const env = proc.env;
        for (const [key, value] of Object.entries(env)) {
            if (key.startsWith('MAPCORE_') && value) {
                const shortKey = key.replace('MAPCORE_', '');
                this.resolvedEnvMap[shortKey] = value;
            }
        }
        if (env.MAPCORE_TILE_BASE)
            this.config.tileServiceBase = env.MAPCORE_TILE_BASE;
        if (env.MAPCORE_CESIUM_BASE_URL)
            this.config.cesiumBaseUrl = env.MAPCORE_CESIUM_BASE_URL;
        if (env.MAPCORE_CESIUM_ION) {
            this.config.cesiumIonServer =
                env.MAPCORE_CESIUM_ION === 'null' ? null : env.MAPCORE_CESIUM_ION;
        }
        if (env.MAPCORE_TERRAIN_URL)
            this.config.terrainServiceUrl = env.MAPCORE_TERRAIN_URL;
    }
    /**
     * 从 Vite import.meta.env 加载 VITE_MAPCORE_ 前缀的环境变量
     * @description 将 VITE_MAPCORE_TILE_BASE 等变量自动映射到 envMap。
     */
    loadFromImportMetaEnv() {
        if (typeof import.meta === 'undefined')
            return;
        const meta = import.meta;
        if (!meta.env || typeof meta.env !== 'object')
            return;
        const env = meta.env;
        for (const [key, value] of Object.entries(env)) {
            if (key.startsWith('VITE_MAPCORE_') && value) {
                const shortKey = key.replace('VITE_MAPCORE_', '');
                this.resolvedEnvMap[shortKey] = value;
            }
        }
        // 映射到 ProxyConfig 字段
        if (env.VITE_MAPCORE_TILE_BASE)
            this.config.tileServiceBase = env.VITE_MAPCORE_TILE_BASE;
        if (env.VITE_MAPCORE_CESIUM_BASE_URL)
            this.config.cesiumBaseUrl = env.VITE_MAPCORE_CESIUM_BASE_URL;
        if (env.VITE_MAPCORE_CESIUM_ION) {
            this.config.cesiumIonServer =
                env.VITE_MAPCORE_CESIUM_ION === 'null' ? null : env.VITE_MAPCORE_CESIUM_ION;
        }
        if (env.VITE_MAPCORE_TERRAIN_URL)
            this.config.terrainServiceUrl = env.VITE_MAPCORE_TERRAIN_URL;
    }
    /**
     * 合并默认值
     */
    mergeWithDefaults(config) {
        return {
            tileServiceBase: config.tileServiceBase,
            cesiumIonServer: config.cesiumIonServer,
            terrainServiceUrl: config.terrainServiceUrl,
            cesiumBaseUrl: config.cesiumBaseUrl,
            envMap: config.envMap,
        };
    }
}
/**
 * 全局部署配置管理器实例（内部单例）
 */
export const deployConfig = new DeployConfigManager();
//# sourceMappingURL=DeployConfig.js.map