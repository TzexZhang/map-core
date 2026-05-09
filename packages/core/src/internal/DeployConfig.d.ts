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
 * 内部部署/代理配置
 * @description SDK 内部使用的资源地址配置。
 *              所有配置项均为可选，未配置时使用默认值。
 */
export interface ProxyConfig {
    /**
     * 默认瓦片服务基础地址
     * 当图层 URL 包含 {{tileBase}} 占位符时，替换为此值
     * @example 'http://192.168.1.100:8080/tiles/{z}/{x}/{y}.png'
     */
    tileServiceBase?: string;
    /**
     * Cesium Ion 服务地址
     * 设为 null 则完全禁用 Cesium Ion（离线部署）
     */
    cesiumIonServer?: string | null;
    /**
     * 地形服务地址
     * @example 'http://192.168.1.100:8080/terrain'
     */
    terrainServiceUrl?: string;
    /**
     * Cesium 静态资源基础路径
     * @example 'http://192.168.1.100/static/cesium'
     */
    cesiumBaseUrl?: string;
    /**
     * 自定义环境变量映射表
     * 用于瓦片 URL 中 {{env:KEY}} 占位符的替换。
     * key 为占位符中的 KEY，value 为替换后的实际地址。
     *
     * @example
     * ```typescript
     * // .env 文件内容自动加载为：
     * {
     *   TILE_BASE: 'http://192.168.1.100:8080/tiles/{z}/{x}/{y}.png',
     *   SATELLITE_URL: 'http://192.168.1.100:8080/satellite/{z}/{x}/{y}.png',
     *   TERRAIN_URL: 'http://192.168.1.100:8080/terrain',
     * }
     * ```
     */
    envMap?: Record<string, string>;
}
/**
 * 部署配置管理器
 * @description 单例模式，管理 SDK 内部部署配置。
 *              - 配置来源优先级：显式设置 > 环境变量 > 默认值
 *              - 外部无法访问或修改此配置
 *              - 瓦片 URL 支持动态占位符替换
 */
export declare class DeployConfigManager {
    /** 当前生效的配置 */
    private config;
    /** 环境变量映射缓存（合并了环境变量和自定义映射） */
    private resolvedEnvMap;
    /** 是否已初始化 */
    private initialized;
    /**
     * 创建部署配置管理器
     * @param config - 初始配置
     */
    constructor(config?: ProxyConfig);
    /**
     * 初始化部署配置
     * @description 从环境变量加载所有 MAPCORE_ 前缀的变量到 envMap。
     *              同时加载 .env 文件中的配置（由构建工具自动注入）。
     *              仅在 MapController.create() 内部调用一次。
     *
     * @param config - 内部传入的代理配置
     */
    init(config?: ProxyConfig): void;
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
    resolveUrl(url: string): string;
    /**
     * 获取瓦片服务地址
     */
    getTileServiceBase(): string | undefined;
    /**
     * 获取 Cesium Ion 服务地址
     */
    getCesiumIonServer(): string | null | undefined;
    /**
     * 获取地形服务地址
     */
    getTerrainServiceUrl(): string | undefined;
    /**
     * 获取 Cesium 静态资源路径
     */
    getCesiumBaseUrl(): string | undefined;
    /**
     * 获取完整配置快照（只读）
     */
    getConfig(): Readonly<ProxyConfig>;
    /**
     * 从 Node.js process.env 加载 MAPCORE_ 前缀的环境变量
     * @description 将 MAPCORE_TILE_BASE 等变量自动映射到 envMap 和对应配置字段。
     */
    private loadFromProcessEnv;
    /**
     * 从 Vite import.meta.env 加载 VITE_MAPCORE_ 前缀的环境变量
     * @description 将 VITE_MAPCORE_TILE_BASE 等变量自动映射到 envMap。
     */
    private loadFromImportMetaEnv;
    /**
     * 合并默认值
     */
    private mergeWithDefaults;
}
/**
 * 全局部署配置管理器实例（内部单例）
 */
export declare const deployConfig: DeployConfigManager;
//# sourceMappingURL=DeployConfig.d.ts.map