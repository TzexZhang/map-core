# MapCore SDK

> 通用地图 SDK — 基于 OpenLayers（2D）与 Cesium（3D）的统一地图基础能力封装

## 概述

MapCore 是一个纯 TypeScript 实现的通用地图 SDK，屏蔽 OpenLayers 与 Cesium 的底层 API 差异，对外暴露**统一 TypeScript 接口**。SDK **只提供基础地图能力**，业务功能通过插件和自定义数据源扩展。

### 架构原则

- **SDK 只做基础能力**：地图渲染、图层管理、视图控制、事件系统
- **数据获取归业务方**：SDK 不暴露 HTTP/WebSocket 数据源给外部，业务方自行获取数据后通过 `updateLayerData()` 或 `ICustomDataSource` 注入
- **扩展靠插件**：测量、绘制、轨迹回放等业务功能通过 IPlugin 接口扩展
- **内外隔离**：内部 HTTP/WS 是 SDK 私有实现，外部不可调用

---

## 快速开始

### 安装

```bash
pnpm install @mapcore/sdk ol cesium
```

### 基础使用

```typescript
import { MapController, EngineType, LayerType } from '@mapcore/sdk';

// 1. 创建地图
const map = await MapController.create({
  container: 'map-container',
  engine: EngineType.OpenLayers,
  initialView: { center: [116.397428, 39.90923], zoom: 10 },
});

// 2. 添加底图
map.addLayer({
  id: 'base-tile',
  type: LayerType.Tile,
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
});

// 3. 添加矢量图层
map.addLayer({
  id: 'targets',
  type: LayerType.Vector,
  style: {
    fillColor: 'rgba(255, 0, 0, 0.3)',
    strokeColor: '#ff0000',
    pointRadius: 6,
  },
});

// 4. 外部获取数据后注入图层（业务方自行获取数据）
const response = await fetch('https://my-api.com/targets');
const geojsonData = await response.json();
map.updateLayerData('targets', geojsonData);

// 5. 监听事件
map.on('map:click', (payload) => {
  console.log('点击位置:', payload.lngLat);
});

// 6. 销毁
map.destroy();
```

---

## 外部可调用 API

### MapController（主控制器）

SDK 的核心入口，所有操作通过此类进行。

#### 生命周期

| API | 说明 | 返回值 |
|-----|------|--------|
| `MapController.create(options)` | 创建地图实例 | `Promise<MapController>` |
| `map.destroy()` | 销毁实例，释放所有资源 | `void` |

#### 图层操作

| API | 说明 | 返回值 |
|-----|------|--------|
| `map.addLayer(config, groupId?)` | 添加图层 | `string` |
| `map.addLayers(configs, groupId?)` | 批量添加图层 | `string[]` |
| `map.removeLayer(layerId)` | 移除图层 | `void` |
| `map.setLayerVisible(layerId, visible)` | 设置可见性 | `void` |
| `map.setLayerOpacity(layerId, opacity)` | 设置透明度（0~1） | `void` |
| `map.updateLayerData(layerId, data)` | **更新矢量图层数据（外部数据注入核心方法）** | `void` |
| `map.setGroupVisible(groupId, visible)` | 按分组设置可见性 | `void` |
| `map.getLayerState(layerId)` | 获取图层状态 | `LayerState \| undefined` |
| `map.getLayerStates()` | 获取所有图层状态 | `LayerState[]` |
| `map.exportLayerConfigs()` | 导出图层配置 | `LayerConfig[]` |
| `map.importLayerConfigs(configs)` | 导入图层配置 | `void` |

#### 视图控制

| API | 说明 | 返回值 |
|-----|------|--------|
| `map.setView(state)` | 设置视图（立即跳转） | `void` |
| `map.getView()` | 获取当前视图状态 | `ViewState` |
| `map.flyTo(options)` | 飞行到目标位置（带动画） | `Promise<void>` |
| `map.getBounds()` | 获取当前可视范围 | `BoundingBox` |

#### 自定义数据源

| API | 说明 | 返回值 |
|-----|------|--------|
| `map.registerCustomDataSource(source)` | 注册自定义数据源 | `void` |
| `map.unregisterCustomDataSource(sourceId)` | 注销自定义数据源 | `void` |
| `map.fetchFromCustomSource(sourceId)` | 从自定义数据源拉取数据 | `Promise<GeoJSONFeatureCollection>` |
| `map.startCustomDataSource(sourceId, interval)` | 启动定时刷新 | `void` |
| `map.stopCustomDataSource(sourceId)` | 停止定时刷新 | `void` |

#### 事件系统

| API | 说明 | 返回值 |
|-----|------|--------|
| `map.on(event, handler)` | 订阅事件 | `() => void`（取消订阅） |
| `map.once(event, handler)` | 订阅一次性事件 | `void` |
| `map.off(event, handler)` | 取消订阅 | `void` |

#### 插件系统

| API | 说明 | 返回值 |
|-----|------|--------|
| `map.use(plugin, options?)` | 注册并安装插件 | `Promise<void>` |
| `map.unuse(pluginName)` | 卸载插件 | `void` |

#### 底层访问

| API | 说明 | 返回值 |
|-----|------|--------|
| `map.getNativeInstance()` | 获取底层引擎实例（逃生舱口） | `unknown` |
| `map.getEventBus()` | 获取事件总线 | `EventBus` |

---

### 事件列表

| 事件名 | 常量 | 说明 |
|--------|------|------|
| `map:click` | `MapEvents.MAP_CLICK` | 地图单击 |
| `map:dblclick` | `MapEvents.MAP_DBLCLICK` | 地图双击 |
| `map:pointermove` | `MapEvents.MAP_POINTERMOVE` | 鼠标移动 |
| `map:moveend` | `MapEvents.MAP_MOVEEND` | 视图变化完成 |
| `map:contextmenu` | `MapEvents.MAP_CONTEXTMENU` | 右键菜单 |
| `feature:click` | `MapEvents.FEATURE_CLICK` | 要素点击 |
| `feature:hover` | `MapEvents.FEATURE_HOVER` | 要素悬停 |
| `layer:add` | `MapEvents.LAYER_ADD` | 图层添加 |
| `layer:remove` | `MapEvents.LAYER_REMOVE` | 图层移除 |
| `datasource:update` | `MapEvents.DATASOURCE_UPDATE` | 数据源更新 |
| `system:ready` | `MapEvents.READY` | SDK 初始化完成 |

---

### 图层类型

| 枚举值 | 说明 | 引擎 |
|--------|------|------|
| `LayerType.Tile` | 栅格瓦片（XYZ/TMS） | OL / Cesium |
| `LayerType.WMS` | OGC WMS 服务 | OL / Cesium |
| `LayerType.WMTS` | OGC WMTS 服务 | OL / Cesium |
| `LayerType.Vector` | 矢量要素（GeoJSON） | OL / Cesium |
| `LayerType.Heatmap` | 热力图 | OL |
| `LayerType.Tileset3D` | 3D Tiles | Cesium |
| `LayerType.Terrain` | 地形服务 | Cesium |
| `LayerType.CZML` | CZML 动态数据 | Cesium |
| `LayerType.Custom` | 自定义图层 | 插件扩展 |

---

## 使用示例

### 方式一：直接注入数据（最简单）

```typescript
const map = await MapController.create({
  container: 'map',
  engine: EngineType.OpenLayers,
});

map.addLayer({ id: 'targets', type: LayerType.Vector });

// 业务方自行获取数据，注入地图
async function refreshTargets() {
  const res = await fetch('/api/targets');
  const data = await res.json();
  map.updateLayerData('targets', data);
}
refreshTargets();
```

### 方式二：注册自定义数据源（支持定时刷新）

```typescript
// 实现自定义数据源接口
map.registerCustomDataSource({
  id: 'my-targets',
  async fetch() {
    const res = await fetch('/api/targets');
    return res.json();
  },
  dispose() { /* 清理资源 */ },
});

// 手动拉取一次
const data = await map.fetchFromCustomSource('my-targets');
map.updateLayerData('targets', data);

// 或启动定时刷新（每 5 秒）
map.startCustomDataSource('my-targets', 5000);

// 监听数据更新事件
map.on('datasource:update', (payload) => {
  if (payload.sourceId === 'my-targets') {
    map.updateLayerData('targets', payload.data);
  }
});
```

### 方式三：插件扩展业务功能

```typescript
import type { IPlugin, PluginContext } from '@mapcore/sdk';

const measurePlugin: IPlugin = {
  name: 'MeasureTool',
  version: '1.0.0',
  install(ctx: PluginContext) {
    let points: [number, number][] = [];
    ctx.eventBus.on('map:click', (payload: any) => {
      points.push(payload.lngLat);
      if (points.length === 2) {
        const dist = distance(points[0], points[1]);
        console.log(`距离: ${(dist / 1000).toFixed(2)} 公里`);
        points = [];
      }
    });
  },
  uninstall() { /* 清理 */ },
};

await map.use(measurePlugin);
```

### 3D 地球（Cesium）

```typescript
const map = await MapController.create({
  container: 'map',
  engine: EngineType.Cesium,
  initialView: {
    center: [116.397, 39.909],
    zoom: 10,
    pitch: -45,
    heading: 0,
  },
});

map.addLayer({
  id: 'buildings',
  type: LayerType.Tileset3D,
  url: '/3dtiles/buildings/tileset.json',
});

map.addLayer({
  id: 'terrain',
  type: LayerType.Terrain,
  url: '/terrain/world',
});
```

### WebComponent 方式

```html
<map-core engine="openlayers" center="116.397,39.909" zoom="10"></map-core>

<script>
  const mapEl = document.querySelector('map-core');
  mapEl.addEventListener('map-ready', (e) => {
    const controller = e.detail.controller;
    controller.addLayer({
      id: 'base',
      type: 'tile',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    });
  });
</script>
```

---

## 项目结构

```
packages/
├── core/              # 核心包 - 类型、接口、事件、工具（零依赖）
├── adapter-ol/        # OpenLayers 2D 引擎适配器（内部）
├── adapter-cesium/    # Cesium 3D 引擎适配器（内部）
├── datasource/        # 数据源管理（内部实现，不暴露给外部）
├── bridge/            # 跨端通信桥（内部 + 可选外部使用）
└── sdk/               # 聚合包（对外发布入口）
```

---

## 部署方案

### 瓦片资源动态配置

所有瓦片资源 URL 支持通过 SDK 项目自身的 `.env` 文件动态配置。构建时由 Vite/Webpack 将环境变量注入产物，运行时自动替换。外部调用方无需关心部署地址，直接使用占位符即可。

```typescript
// 外部调用方代码：使用占位符，不硬编码地址
map.addLayer({
  id: 'base-tile',
  type: LayerType.Tile,
  url: '{{env:TILE_BASE}}',   // 构建时从 SDK 项目的 .env 替换
});

map.addLayer({
  id: 'satellite',
  type: LayerType.Tile,
  url: '{{env:SATELLITE_URL}}',
});

// 也可以使用内置占位符
map.addLayer({
  id: 'base',
  type: LayerType.Tile,
  url: '{{tileBase}}',        // 替换为 ProxyConfig.tileServiceBase
});
```

```bash
# SDK 项目的 .env 文件（构建时注入产物，不随外部项目发布）
MAPCORE_TILE_BASE=http://192.168.10.5:8080/tiles/{z}/{x}/{y}.png
MAPCORE_SATELLITE_URL=http://192.168.10.5:8080/satellite/{z}/{x}/{y}.png
MAPCORE_TERRAIN_URL=http://192.168.10.5:8080/terrain
MAPCORE_CESIUM_BASE_URL=http://192.168.10.5:8080/cesium
MAPCORE_CESIUM_ION=null

# Vite 项目使用 VITE_ 前缀
VITE_MAPCORE_TILE_BASE=http://192.168.10.5:8080/tiles/{z}/{x}/{y}.png
VITE_MAPCORE_SATELLITE_URL=http://192.168.10.5:8080/satellite/{z}/{x}/{y}.png
```

### 占位符语法

| 格式 | 说明 | 示例 |
|------|------|------|
| `{{env:KEY}}` | 从环境变量 MAPCORE_KEY 读取 | `{{env:TILE_BASE}}` → `.env` 中 `MAPCORE_TILE_BASE` 的值 |
| `{{tileBase}}` | 内置：默认瓦片地址 | → `ProxyConfig.tileServiceBase` |
| `{{terrainUrl}}` | 内置：地形服务地址 | → `ProxyConfig.terrainServiceUrl` |
| `{{cesiumBaseUrl}}` | 内置：Cesium 资源路径 | → `ProxyConfig.cesiumBaseUrl` |

### 配置项说明

| 环境变量 | 说明 | 示例 |
|----------|------|------|
| `MAPCORE_TILE_BASE` | 默认瓦片服务地址 | `http://192.168.1.100:8080/tiles/{z}/{x}/{y}.png` |
| `MAPCORE_CESIUM_BASE_URL` | Cesium 静态资源路径 | `http://192.168.1.100/static/cesium` |
| `MAPCORE_CESIUM_ION` | Cesium Ion 地址，`null` 禁用 | `null` |
| `MAPCORE_TERRAIN_URL` | 地形服务地址 | `http://192.168.1.100:8080/terrain` |

#### 架构隔离

```
┌─────────────────────────────────────┐
│         外部业务方（不可见）          │
│   MapCoreOptions { container, engine }│
│   无 proxy / deploy / 数据源配置     │
├─────────────────────────────────────┤
│           SDK 公共 API 层            │
│   MapController.addLayer()          │
│   MapController.updateLayerData()   │
│   MapController.registerCustom...() │
├─────────────────────────────────────┤
│         SDK 内部层（不可见）          │
│   DeployConfigManager ← 环境变量     │
│   内部 HTTP/WS 数据获取              │
│   引擎适配器 (OL / Cesium)          │
└─────────────────────────────────────┘
```

---

## 工程化

```bash
pnpm install          # 安装依赖
pnpm build            # 构建
pnpm test             # 运行测试
pnpm lint             # 代码检查
pnpm format           # 格式化
```

---

## License

MIT
