# MapCore SDK

> 通用地图 SDK — 基于 OpenLayers（2D）与 Cesium（3D）的统一地图基础能力封装

---

## 项目概述

MapCore 是一个纯 TypeScript 实现的通用地图 SDK，屏蔽 OpenLayers 与 Cesium 的底层 API 差异，对外暴露统一 TypeScript 接口。SDK 只提供基础地图能力（渲染、图层、视图、事件），业务功能通过插件和自定义数据源扩展。

### 架构原则

- **SDK 只做基础能力**：地图渲染、图层管理、视图控制、事件系统
- **数据获取归业务方**：SDK 不暴露 HTTP/WebSocket 数据源给外部
- **扩展靠插件**：业务功能通过 `IPlugin` 接口扩展
- **内外隔离**：内部 HTTP/WS 是 SDK 私有实现，外部不可调用

### 坐标系统设计

SDK 采用 **内部统一 + 外部可选** 的坐标系统策略：

| 层级 | 坐标系 | 说明 |
| --- | --- | --- |
| SDK 外部接口 | 由 `coordinateSystem` 配置决定 | `'EPSG:4326'`（默认）或 `'EPSG:3857'` |
| OLMapEngine 内部 | EPSG:3857 (Web Mercator) | OpenLayers 原生投影 |
| CesiumMapEngine 内部 | EPSG:4326 (WGS84) | Cesium 原生坐标系 |
| GeoJSON 数据 | EPSG:4326 | 遵循 RFC 7946 规范，不受配置影响 |

适配器层通过 `toInternal()` / `toExternal()` 方法透明转换，调用方只需设置 `coordinateSystem` 即可。

**关键文件**：
- `packages/core/src/types/map.types.ts` — `CoordinateSystem` 类型定义、`MapCoreOptions.coordinateSystem` 字段
- `packages/adapter-ol/src/OLMapEngine.ts` — OL 适配器坐标转换逻辑
- `packages/adapter-cesium/src/CesiumMapEngine.ts` — Cesium 适配器坐标转换逻辑

---

## 项目结构

```
MapCore/
├── packages/
│   ├── core/               # 核心包 — 类型、接口、事件、工具（零依赖）
│   ├── adapter-ol/         # OpenLayers 2D 引擎适配器（内部）
│   ├── adapter-cesium/     # Cesium 3D 引擎适配器（内部）
│   ├── datasource/         # 数据源管理（内部，不暴露给外部）
│   ├── bridge/             # 跨端通信桥（Android/iOS/Qt）
│   └── sdk/                # 聚合包（对外发布入口，含 Vite 插件）
├── .eslintrc.cjs
├── tsconfig.base.json
├── tsconfig.json
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── README.md               # 本文档（项目开发者文档）
└── GUIDE.md                # 外部使用者指南
```

### 包依赖关系

```
                    ┌──────────────┐
                    │  @mapcore/sdk │  ← 对外发布入口
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
    │ adapter-ol  │  │ adapter-   │  │   bridge   │
    │ (2D 引擎)   │  │ cesium     │  │ (跨端通信)  │
    └──────┬──────┘  │ (3D 引擎)  │  └─────┬──────┘
           │         └─────┬──────┘        │
           │               │               │
    ┌──────▼───────────────▼───────────────▼──┐
    │              @mapcore/core              │
    │       （类型、接口、事件、工具）           │
    └───────────────────┬────────────────────┘
                        │
                ┌───────▼────────┐
                │   datasource   │
                │ （数据源管理）   │
                └────────────────┘
```

### 各包职责

| 包名 | 职责 | 对外可见 | 依赖 | 外部使用场景 |
| --- | --- | --- | --- | --- |
| `@mapcore/core` | 类型定义、接口契约、事件系统、工具函数、部署配置 | ✅ | 无（零依赖） | 需要 `IDataSource`/`IDataSourceManager` 等 SDK 未导出的接口时单独引用 |
| `@mapcore/adapter-ol` | OpenLayers 2D 引擎适配器 | ❌ | core, ol (peer) | 不建议直接引用，由 `MapController` 内部创建 |
| `@mapcore/adapter-cesium` | Cesium 3D 引擎适配器 | ❌ | core, cesium (peer) | 不建议直接引用，由 `MapController` 内部创建 |
| `@mapcore/datasource` | HTTP/WebSocket 数据源管理、中间件 | ❌ | core | 不建议直接引用，SDK 内部私有能力，外部通过 `ICustomDataSource` 注入数据 |
| `@mapcore/bridge` | 跨端通信桥（Android/iOS/Qt） | ✅ | core | 已通过 SDK 导出 `BridgeFactory`/`BridgeEnvironment`，通常无需单独引用 |
| `@mapcore/sdk` | 聚合包，统一导出入口；提供 `mapEngineSetup()` Vite 插件 | ✅ | 所有子包 | **始终安装**，所有项目的唯一入口 |

---

## 环境要求

| 工具 | 版本要求 |
| --- | --- |
| Node.js | >= 18.0.0 |
| pnpm | >= 8.0.0 |
| 操作系统 | Windows / macOS / Linux |

---

## 开发指南

### 安装依赖

```bash
pnpm install
```

pnpm workspace 自动关联所有子包，无需手动 link。

### 构建命令

```bash
pnpm build        # 全量构建（Turborepo 按依赖顺序编排）
pnpm type-check   # TypeScript 类型检查
pnpm lint         # ESLint 检查
pnpm lint:fix     # ESLint 自动修复
pnpm format       # Prettier 格式化
pnpm test         # 运行测试
pnpm clean        # 清理构建产物
```

### 开发流程

```bash
# 1. 安装依赖
pnpm install

# 2. 修改代码...

# 3. 类型检查 + lint
pnpm type-check && pnpm lint

# 4. 构建（Turborepo 自动检测变更，只重构建受影响的包）
pnpm build
```

### 添加新类型/接口

1. 在 `packages/core/src/types/` 或 `interfaces/` 中定义
2. 在 `packages/core/src/types/index.ts` 中导出
3. 在 `packages/sdk/src/index.ts` 中重新导出（如果需要对外暴露）

---

## 环境配置

### 瓦片资源地址

编辑 `.env` 文件配置瓦片和 Cesium 资源地址：

```bash
# .env（开发环境 — 在线资源）
MAPCORE_TILE_BASE=https://tile.openstreetmap.org/{z}/{x}/{y}.png
MAPCORE_CESIUM_ION=null
```

```bash
# .env.production（生产环境 — 内网地址）
MAPCORE_TILE_BASE=http://192.168.10.5:8080/tiles/{z}/{x}/{y}.png
MAPCORE_CESIUM_BASE_URL=http://192.168.10.5:8080/cesium
MAPCORE_CESIUM_ION=null
```

### 配置变量说明

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `MAPCORE_TILE_BASE` | 是 | 默认瓦片底图地址 |
| `MAPCORE_SATELLITE_URL` | 否 | 卫星影像瓦片地址 |
| `MAPCORE_WMS_URL` | 否 | WMS 服务地址 |
| `MAPCORE_CESIUM_BASE_URL` | 3D 时必填 | Cesium 静态资源路径 |
| `MAPCORE_CESIUM_ION` | 否 | Cesium Ion 地址，`null` 禁用 |
| `MAPCORE_TERRAIN_URL` | 否 | 地形服务地址 |
| `MAPCORE_TILESET3D_URL` | 否 | 3D Tiles 服务路径 |

### 占位符机制

SDK 内部 `DeployConfigManager` 支持在 URL 中使用占位符：

| 格式 | 说明 |
| --- | --- |
| `{{env:KEY}}` | 从环境变量 `MAPCORE_KEY` 读取 |
| `{{tileBase}}` | 内置：默认瓦片地址 |
| `{{tileBase}}` | 内置：瓦片服务基础路径 |
| `{{cesiumBaseUrl}}` | 内置：Cesium 资源路径 |

---

## 部署方案

### 构建产物

```bash
pnpm build
```

构建完成后各包产物位于 `packages/*/dist/`：

| 包 | 产物 |
| --- | --- |
| `core` | `dist/types/` + `dist/index.js` (ESM) |
| `adapter-ol` | `dist/types/` + `dist/index.js` |
| `adapter-cesium` | `dist/types/` + `dist/index.js` |
| `datasource` | `dist/types/` + `dist/index.js` |
| `bridge` | `dist/types/` + `dist/index.js` |
| `sdk` | `dist/types/` + `dist/mapcore.esm.js` + `dist/mapcore.umd.js` |

### 外部引用方式

**方式一：file: 协议引用（开发阶段）**

```json
{
  "dependencies": {
    "@mapcore/sdk": "file:../MapCore/packages/sdk"
  }
}
```

**方式二：构建产物拷贝**

```bash
cp -r packages/sdk/dist/ /your-project/libs/mapcore/
```

### 生产环境部署清单

| 步骤 | 说明 |
| --- | --- |
| 1. 瓦片服务 | 部署内网 XYZ/TMS 瓦片服务 |
| 2. Cesium 静态资源 | 将 `cesium/Build/Cesium/` 下的 Workers/Assets/ThirdParty/Widgets 部署到 HTTP 服务器 |
| 2. Cesium 资源 | Workers/Assets/Widgets 复制到静态服务器 |
| 4. 环境变量 | 配置 `.env.production` 指向内网服务地址 |
| 5. 禁用 Ion | 设置 `MAPCORE_CESIUM_ION=null` 禁用 Cesium Ion 外网请求 |

---

## 常见问题

### 修改 core 后下游包报类型错误

```bash
cd packages/core && pnpm build
cd ../.. && pnpm build
```

### 构建报错

```bash
pnpm clean && pnpm build
```

### peer 依赖缺失

```bash
cd packages/adapter-ol && pnpm install
cd packages/adapter-cesium && pnpm install
```

---

## License

MIT
