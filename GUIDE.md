# MapCore SDK 使用指南

> **目标读者**：使用 `@mapcore/sdk` 的前端/移动端/桌面端开发者
> **文档用途**：安装、初始化、各平台集成、API 调用参考

***

## 目录

- [一、安装](#一安装)
- [二、2D 地图（OpenLayers）](#二2d-地图openlayers)
  - [Web 前端框架（Vue 3 / React）](#web-前端框架vue-3--react-2d)
  - [Qt WebEngine](#qt-webengine-2d)
  - [移动端 WebView](#移动端-webview-2d)
  - [Web 原生 HTML/JS](#web-原生-htmljs-2d)
- [三、3D 地球（Cesium）](#三3d-地球cesium)
  - [Web 前端框架（Vue 3 / React）](#web-前端框架vue-3--react-3d)
  - [Qt WebEngine](#qt-webengine-3d)
  - [Web 原生 HTML/JS](#web-原生-htmljs-3d)
- [四、底图自动加载](#四底图自动加载)
- [坐标系统](#坐标系统)
- [五、API 参考](#五api-参考)
  - [MapCoreOptions 配置项](#mapcoreoptions-配置项)
  - [MapController 方法](#mapcontroller-方法)
- [六、事件列表](#六事件列表)
- [七、图层类型](#七图层类型)
- [八、数据源管理](#八数据源管理)
- [九、插件系统](#九插件系统)
- [十、跨端通信桥](#十跨端通信桥)
- [十一、工具函数](#十一工具函数)
- [十二、Vite 插件选项](#十二vite-插件选项)
  - [导入方式](#导入方式)
  - [选项](#选项)
  - [插件行为](#插件行为)
  - [最小配置（2D + 3D 项目）](#最小配置2d--3d-项目)
  - [仅 2D 项目](#仅-2d-项目)
- [十三、通用注意事项](#十三通用注意事项)

***

## 一、安装

### 必选包

| 包              | 说明                                               | 安装   |
| -------------- | ------------------------------------------------ | ---- |
| `@mapcore/sdk` | SDK 聚合入口，包含 MapController、全部公共类型/枚举/工具函数、Vite 插件 | 始终安装 |

### 引擎依赖（按需安装）

| 包                 | 说明        | 使用场景        |
| ----------------- | --------- | ----------- |
| `ol` (OpenLayers) | 2D 平面地图引擎 | 需要 2D 地图时安装 |
| `cesium`          | 3D 地球引擎   | 需要 3D 地球时安装 |

> 两个引擎可以同时安装，运行时通过 `EngineType` 切换。

### 可选子包（直接引用）

以下子包已通过 `@mapcore/sdk` 聚合导出公共 API，大多数场景不需要单独引用。仅在需要 SDK 未导出的内容时单独安装：

| 包                 | 说明                                | 单独引用场景                                                  |
| ----------------- | --------------------------------- | ------------------------------------------------------- |
| `@mapcore/core`   | 类型、接口、事件、工具函数（零依赖）                | 需要 `IDataSource`/`IDataSourceManager` 等未聚合导出的接口时        |
| `@mapcore/bridge` | 跨端通信桥（Qt/Android/iOS/PostMessage） | 已通过 SDK 导出 `BridgeFactory`/`BridgeEnvironment`，通常无需单独引用 |

> **不建议直接引用**的包：`@mapcore/adapter-ol`、`@mapcore/adapter-cesium`、`@mapcore/datasource`。这三个是 SDK 内部实现，由 `MapController` 内部创建和管理，外部不应直接实例化。

### 安装命令

```bash
# 2D 地图（OpenLayers）
npm install @mapcore/sdk ol

# 3D 地球（Cesium）
npm install @mapcore/sdk cesium

# 2D + 3D 同时使用
npm install @mapcore/sdk ol cesium

# 需要直接使用 core 包中未聚合导出的接口时，额外安装
npm install @mapcore/core
```

### Vite 项目配置

安装后，在 `vite.config.ts` 中使用 `mapEngineSetup()` 插件（自动处理 Cesium 静态资源）：

```typescript
import { mapEngineSetup } from '@mapcore/sdk/vite';

export default defineConfig({
  plugins: [vue(), mapEngineSetup()],
});
```

> **CSS 自动注入**：SDK 在引擎初始化时自动注入 `ol/ol.css`（2D）或 `cesium/widgets.css`（3D）。使用 Vite/Webpack 5 的项目**无需手动引入**。纯 HTML 或 Qt 本地页面场景 SDK 自动回退为 CDN `<link>` 加载。

***

## 二、2D 地图（OpenLayers）

### Web 前端框架（Vue 3 / React） 2D

**Vue 3 示例**

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { MapController, EngineType, LayerType } from '@mapcore/sdk';

const mapContainer = ref<HTMLDivElement>();
let map: MapController | null = null;

onMounted(async () => {
  map = await MapController.create({
    container: mapContainer.value!,
    engine: EngineType.OpenLayers,
    initialView: { center: [116.397428, 39.90923], zoom: 10 },
  });
  map.addLayer({ id: 'targets', type: LayerType.Vector });
  map.on('map:click', (payload: any) => console.log('点击:', payload.lngLat));
});

onBeforeUnmount(() => map?.destroy());
</script>

<template>
  <div ref="mapContainer" style="width: 100%; height: 600px;"></div>
</template>
```

**React 示例**

```tsx
import { useEffect, useRef } from 'react';
import { MapController, EngineType } from '@mapcore/sdk';

function MapView() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapController | null>(null);

  useEffect(() => {
    let destroyed = false;
    MapController.create({
      container: ref.current!,
      engine: EngineType.OpenLayers,
      initialView: { center: [116.397428, 39.90923], zoom: 10 },
    }).then((map) => {
      if (!destroyed) mapRef.current = map;
    });
    return () => {
      destroyed = true;
      mapRef.current?.destroy();
    };
  }, []);

  return <div ref={ref} style={{ width: '100%', height: '600px' }} />;
}
```

| 注意点      | 说明                          |
| -------- | --------------------------- |
| **CSS**  | SDK 自动注入 `ol/ol.css`，无需手动引入 |
| **容器尺寸** | `height` 必须为明确值（如 `600px`）  |
| **底图**   | 默认自动加载 OSM，无需手动添加           |
| **销毁**   | 组件卸载时必须调用 `destroy()`       |

***

### Qt WebEngine 2D

Qt 通过 `QWebEngineView` 嵌入 WebView 渲染地图，通过 `QWebChannel` 实现双向通信。

#### 方式 A：Qt 加载前端打包产物（推荐）

**流程**

```
前端项目（Vue/React）          Qt 应用（C++）
    │                              │
    ├─ npm run build               │
    │   ↓ 生成 dist/               │
    │   ├─ index.html              │
    │   ├─ assets/*.js             │
    │   └─ assets/*.css            │
    │                              │
    └─ 将 dist/ 拷贝到 Qt 项目 ──→ QWebEngineView::load(QUrl("file:///...dist/index.html"))
```

**步骤 1：前端项目打包**

```bash
# 在业务前端项目中（如 MapCoreDemo）
npm install
npm run build        # 生成 dist/ 目录
```

> **`dist/index.html`** **在哪里？** 它是**业务方前端项目**执行 `npm run build`（Vite 打包）后生成的产物目录，位于业务项目根目录下的 `dist/index.html`。MapCore SDK 项目本身不生成 `dist/index.html`。例如 MapCoreDemo 项目打包后在 `MapCoreDemo/dist/index.html`。

**步骤 2：Qt 加载打包产物**

```cpp
#include <QWebEngineView>
#include <QWebChannel>

// 加载本地文件系统上的打包产物
QWebEngineView *webView = new QWebEngineView(this);
QString htmlPath = QApplication::applicationDirPath() + "/web/dist/index.html";
webView->load(QUrl::fromLocalFile(htmlPath));

// 或者加载内网 HTTP 服务器上的页面（推荐生产环境）
// webView->load(QUrl("http://192.168.10.5:8080/index.html"));
```

**步骤 3：注册 QWebChannel 桥对象**

```cpp
QWebChannel *channel = new QWebChannel(this);
channel->registerObject("mapBridge", mapBridgeObj);  // 注册 C++ 端对象
webView->page()->setWebChannel(channel);
```

**步骤 4：前端通过 Bridge 通信**

```typescript
import { BridgeFactory } from '@mapcore/sdk';

const bridge = BridgeFactory.detect();  // 自动检测 Qt 环境
await bridge.send('mapReady', { engine: 'openlayers' });
bridge.receive((method, params) => {
  if (method === 'updateTargets') map.updateLayerData('targets', params);
});
```

**方式 A 优势**：CSS、JS、资源文件由 Vite 打包工具统一处理，SDK 的 CSS 自动注入正常工作，无需手动管理资源。

***

#### 方式 B：Qt 加载本地 HTML（离线场景）

适用于无 HTTP 服务器的纯离线环境，将所有资源打入 Qt 资源文件（qrc）。

**步骤 1：准备资源文件**

将以下文件放入 Qt 项目的 `resources/` 目录：

```
resources/
├── index.html              # 地图页面
├── ol.css                  # 从 node_modules/ol/ol.css 拷贝
├── ol.js                   # 从 node_modules/ol/dist/ol.js 拷贝
├── mapcore.umd.js          # 从 MapCore SDK 构建产物拷贝
└── qwebchannel.js          # Qt 自带文件
```

**步骤 2：创建 qrc 资源文件**

```xml
<!-- resources.qrc -->
<RCC>
    <qresource prefix="/">
        <file>index.html</file>
        <file>ol.css</file>
        <file>ol.js</file>
        <file>mapcore.umd.js</file>
        <file>qwebchannel.js</file>
    </qresource>
</RCC>
```

**步骤 3：编写 HTML 页面**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>#map { width: 100%; height: 100vh; }</style>
  <link rel="stylesheet" href="qrc:/ol.css" />
  <script src="qrc:/ol.js"></script>
  <script src="qrc:/qwebchannel.js"></script>
  <script src="qrc:/mapcore.umd.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    MapController.create({
      container: 'map',
      engine: 'openlayers',
      initialView: { center: [116.397, 39.909], zoom: 10 },
    }).then(map => {
      map.addLayer({ id: 'targets', type: 'vector' });
    });
  </script>
</body>
</html>
```

**步骤 4：C++ 端加载**

```cpp
QWebEngineView *webView = new QWebEngineView(this);
webView->load(QUrl("qrc:/index.html"));

QWebChannel *channel = new QWebChannel(this);
channel->registerObject("mapBridge", mapBridgeObj);
webView->page()->setWebChannel(channel);
```

***

#### 方式 A vs 方式 B 对比

| 维度         | 方式 A（打包产物）                              | 方式 B（本地 HTML + qrc） |
| ---------- | --------------------------------------- | ------------------- |
| **部署方式**   | 前端 `npm run build` → 拷贝 `dist/` 到 Qt 项目 | 手动拷贝 JS/CSS 到 qrc   |
| **CSS 处理** | SDK 自动注入                                | 需手动 `<link>` 引入     |
| **更新流程**   | 前端改代码 → 重新 build → 替换 dist/             | 手动替换 qrc 中的 JS/CSS  |
| **适用场景**   | 开发阶段 + 生产环境                             | 纯离线环境               |
| **调试**     | 可用 DevTools                             | 同上                  |

#### Qt CMake 配置示例

```cmake
find_package(Qt6 REQUIRED COMPONENTS Core WebEngineWidgets WebChannel)

target_sources(myapp PRIVATE
    main.cpp
    MapBridge.h MapBridge.cpp
)

# 方式 B 需额外添加：
# target_sources(myapp PRIVATE resources.qrc)
```

#### Qt 调试方法

```bash
# 设置环境变量开启远程调试
set QTWEBENGINE_REMOTE_DEBUGGING=9222

# 启动 Qt 应用后，在 Chrome 浏览器访问
# http://localhost:9222
```

#### Qt 注意点

| 项目                 | 说明                                                                         |
| ------------------ | -------------------------------------------------------------------------- |
| **CSS**            | 方式 A 由 SDK 自动注入；方式 B **必须手动**通过 `<link>` 引入 `ol.css`                       |
| **环境检测**           | SDK 自动检测 `window.qt.webChannelTransport`，无需手动选择 Bridge                     |
| **qwebchannel.js** | Qt 自带文件，位于 Qt 安装目录下                                                        |
| **调试**             | 设置 `QTWEBENGINE_REMOTE_DEBUGGING=9222`，在 Chrome 访问 `http://localhost:9222` |
| **性能**             | 大量 JS 资源建议从文件系统或 HTTP 服务器加载，而非 qrc                                         |
| **内网瓦片**           | 配置 `.env` 的 `MAPCORE_TILE_BASE` 指向内网瓦片服务地址                                 |

***

### 移动端 WebView 2D

#### Android

```typescript
import { MapController, EngineType, BridgeFactory } from '@mapcore/sdk';

const map = await MapController.create({ container: 'map', engine: EngineType.OpenLayers });
const bridge = BridgeFactory.detect();
bridge.receive((method, params) => {
  if (method === 'updateData') map.updateLayerData('targets', params);
});
```

```kotlin
// Android 端
webView.settings.javaScriptEnabled = true
webView.addJavascriptInterface(bridgeObj, "AndroidBridge")
```

#### iOS

```swift
// iOS 端
webView.configuration.userContentController.add(scriptHandler, name: "mapBridge")
```

| 注意点         | 说明                                                                            |
| ----------- | ----------------------------------------------------------------------------- |
| **Android** | 需注册 `@JavascriptInterface`，SDK 检测 `window.AndroidBridge`                      |
| **iOS**     | 需注册 `WKScriptMessageHandler`，SDK 检测 `window.webkit.messageHandlers.mapBridge` |
| **CSS**     | 加载打包页面时 SDK 自动注入；离线本地 HTML 需手动引入                                              |

***

### Web 原生 HTML/JS 2D

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>#map { width: 100%; height: 600px; }</style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ol@9/ol.css" />
</head>
<body>
  <div id="map"></div>
  <script type="module">
    import { MapController, EngineType } from 'https://cdn.jsdelivr.net/npm/@mapcore/sdk/dist/mapcore.esm.js';

    const map = await MapController.create({
      container: 'map',
      engine: EngineType.OpenLayers,
      initialView: { center: [116.397428, 39.90923], zoom: 10 },
    });
    map.on('map:click', (payload) => console.log('点击:', payload.lngLat));
  </script>
</body>
</html>
```

> **纯 HTML 场景**：CSS 通过 `<link>` 手动引入，或由 SDK 自动回退为 CDN 加载。

***

## 三、3D 地球（Cesium）

### Web 前端框架（Vue 3 / React） 3D

**Vite 配置**（`vite.config.ts`）— 使用 `mapEngineSetup()` 自动处理 Cesium 静态资源

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { mapEngineSetup } from '@mapcore/sdk/vite';

export default defineConfig({
  plugins: [vue(), mapEngineSetup()],
});
```

> **`mapEngineSetup()`** **插件功能**：自动检测 `cesium` 包是否存在，将 Workers/Assets/ThirdParty/Widgets 复制到 `public/cesium/`，并注入 `CESIUM_BASE_URL` 全局变量。纯 2D 项目（未安装 `cesium`）自动跳过，零配置影响。详见 [Vite 插件选项](#vite-插件选项)。

**Vue 3 示例**

```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { MapController, EngineType, LayerType } from '@mapcore/sdk';

const mapContainer = ref<HTMLDivElement>();
let map: MapController | null = null;

onMounted(async () => {
  map = await MapController.create({
    container: mapContainer.value!,
    engine: EngineType.Cesium,
    initialView: { center: [116.397, 39.909], zoom: 10, pitch: -45, heading: 0 },
  });
  map.addLayer({
    id: 'buildings',
    type: LayerType.Tileset3D,
    url: '/3dtiles/buildings/tileset.json',
  });
});

onBeforeUnmount(() => map?.destroy());
</script>

<template>
  <div ref="mapContainer" style="width: 100%; height: 600px;"></div>
</template>
```

**React 示例**

```tsx
import { useEffect, useRef } from 'react';
import { MapController, EngineType } from '@mapcore/sdk';

function GlobeView() {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapController | null>(null);

  useEffect(() => {
    let destroyed = false;
    MapController.create({
      container: ref.current!,
      engine: EngineType.Cesium,
      initialView: { center: [116.397, 39.909], zoom: 10, pitch: -45, heading: 0 },
    }).then((map) => {
      if (!destroyed) mapRef.current = map;
    });
    return () => {
      destroyed = true;
      mapRef.current?.destroy();
    };
  }, []);

  return <div ref={ref} style={{ width: '100%', height: '600px' }} />;
}
```

| 注意点      | 说明                                                                    |
| -------- | --------------------------------------------------------------------- |
| **CSS**  | SDK 自动注入 `widgets.css`，无需手动引入                                         |
| **静态资源** | Cesium Workers/Assets/Widgets 由 `mapEngineSetup()` Vite 插件自动处理，无需手动配置 |
| **离线**   | 内网部署设置 `cesiumIonServer: null` 禁用 Ion                                 |
| **包体积**  | `cesium` 约 15MB，建议按需安装                                                |

***

### Qt WebEngine 3D

**方式 A：Qt 加载打包后的前端项目（推荐）**

前端项目正常打包后，Qt 加载 `dist/index.html`。CSS 和静态资源在构建时处理。

**方式 B：Qt 加载本地 HTML**

```html
<head>
  <link rel="stylesheet" href="qrc:/widgets.css" />
  <script src="qrc:/Cesium.js"></script>
  <script src="qrc:/mapcore.umd.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    window.CESIUM_BASE_URL = 'http://192.168.10.5:8080/cesium';
    MapController.create({
      container: 'map',
      engine: 'cesium',
      initialView: { center: [116.397, 39.909], zoom: 10, pitch: -45 },
    });
  </script>
</body>
```

| 注意点      | 说明                                           |
| -------- | -------------------------------------------- |
| **静态资源** | Cesium Workers/Assets 必须部署到 HTTP 服务器或打包进 qrc |
| **内网部署** | `CESIUM_BASE_URL` 配置内网地址                     |
| **性能**   | 建议将 Cesium 静态资源部署到内网 HTTP 服务器而非 qrc，避免首屏加载慢  |

***

### Web 原生 HTML/JS 3D

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>#map { width: 100%; height: 600px; }</style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/cesium@1.120/Build/Cesium/Widgets/widgets.css" />
  <script src="https://cdn.jsdelivr.net/npm/cesium@1.120/Build/Cesium/Cesium.js"></script>
</head>
<body>
  <div id="map"></div>
  <script type="module">
    import { MapController, EngineType } from 'https://cdn.jsdelivr.net/npm/@mapcore/sdk/dist/mapcore.esm.js';

    const map = await MapController.create({
      container: 'map',
      engine: EngineType.Cesium,
      initialView: { center: [116.397, 39.909], zoom: 10, pitch: -45 },
    });
  </script>
</body>
</html>
```

***

## 四、底图自动加载

SDK 创建地图时**自动加载底图**，无需手动调用 `addLayer`。

| 引擎                  | 默认底图               |
| ------------------- | ------------------ |
| **2D (OpenLayers)** | OpenStreetMap 标准瓦片 |
| **3D (Cesium)**     | OSM 影像瓦片           |

### 自定义底图

```typescript
const map = await MapController.create({
  container: 'map',
  engine: EngineType.OpenLayers,
  basemap: {
    url: 'http://内网瓦片服务/{z}/{x}/{y}.png',
    opacity: 0.8,
    minZoom: 3,
    maxZoom: 18,
  },
});
```

### 不加载底图

```typescript
const map = await MapController.create({
  container: 'map',
  engine: EngineType.OpenLayers,
  basemap: { preset: 'blank' },
});
```

<br />

***

## 坐标系统

SDK 支持两种外部坐标系，通过 `coordinateSystem` 配置项控制所有 API 的输入输出坐标格式：

| 值             | 坐标格式                  | 单位 | 示例                        |
| ------------- | --------------------- | -- | ------------------------- |
| `'EPSG:4326'` | WGS84 经纬度 `[经度, 纬度]`  | 度  | `[116.397, 39.909]`（默认）   |
| `'EPSG:3857'` | Web Mercator `[x, y]` | 米  | `[12958175.4, 4852834.1]` |

### 影响范围

以下 API 的坐标参数会根据 `coordinateSystem` 配置自动转换：

| API                  | 说明                  |
| -------------------- | ------------------- |
| `initialView.center` | 初始视图中心点             |
| `map.setView()`      | 设置视图的中心点            |
| `map.getView()`      | 获取当前视图的中心点          |
| `map.flyTo()`        | 飞行目标中心点             |
| `map.getBounds()`    | 获取可视范围的边界坐标         |
| `map.project()`      | 屏幕坐标 → 地理坐标的输出      |
| `map.unproject()`    | 地理坐标 → 屏幕坐标的输入      |
| `map:click` 事件       | 点击事件返回的 `lngLat` 字段 |
| `feature:click` 事件   | 要素点击返回的坐标           |

### 使用示例

**默认模式（EPSG:4326）— 经纬度坐标**

```typescript
const map = await MapController.create({
  container: 'map',
  engine: EngineType.OpenLayers,
  coordinateSystem: 'EPSG:4326',   // 默认值，可省略
  initialView: { center: [116.397, 39.909], zoom: 10 },   // [经度, 纬度]
});

map.on('map:click', (payload) => {
  console.log(payload.lngLat);  // [116.xxx, 39.xxx]  经纬度
});
```

**Mercator 模式（EPSG:3857）— 投影坐标**

```typescript
const map = await MapController.create({
  container: 'map',
  engine: EngineType.OpenLayers,
  coordinateSystem: 'EPSG:3857',
  initialView: { center: [12958175.4, 4852834.1], zoom: 10 },   // [x(米), y(米)]
});

map.on('map:click', (payload) => {
  console.log(payload.lngLat);  // [12958xxx, 4852xxx]  投影坐标（米）
});
```

### 内部转换机制

SDK 内部自动处理坐标投影转换，调用方无需关心底层引擎使用的坐标系：

```
外部调用方（EPSG:4326 或 EPSG:3857）
        │
        ▼
  SDK 适配器层（自动转换）
        │
        ├── OLMapEngine → 内部使用 EPSG:3857
        │     toInternal(): 外部坐标 → 3857
        │     toExternal(): 3857 → 外部坐标
        │
        └── CesiumMapEngine → 内部使用 EPSG:4326 (WGS84)
              toInternal(): 外部坐标 → 4326
              toExternal(): 4326 → 外部坐标
```

> **注意**：`updateLayerData()` 注入的 GeoJSON 数据中的坐标**始终为 EPSG:4326 经纬度格式**，不受 `coordinateSystem` 配置影响。GeoJSON 规范（RFC 7946）规定坐标使用 WGS84。

***

## 五、API 参考

### MapCoreOptions 配置项

`MapController.create(options)` 接收以下配置对象：

```typescript
interface MapCoreOptions {
  container: HTMLElement | string;
  engine: EngineType;
  coordinateSystem?: CoordinateSystem;
  initialView?: ViewState;
  basemap?: BasemapConfig;
  debug?: DebugConfig;
  plugins?: IPlugin[];
}
```

| 字段                 | 类型                      | 必填 | 说明                                                                                                                    |
| ------------------ | ----------------------- | -- | --------------------------------------------------------------------------------------------------------------------- |
| `container`        | `HTMLElement \| string` | ✅  | 地图挂载容器。可以是 DOM 元素对象或元素的 ID 字符串                                                                                        |
| `engine`           | `EngineType`            | ✅  | 渲染引擎类型。`EngineType.OpenLayers`（2D）或 `EngineType.Cesium`（3D）                                                           |
| `coordinateSystem` | `CoordinateSystem`      | ❌  | 外部接口使用的坐标系。`'EPSG:4326'`（默认，WGS84 经纬度）或 `'EPSG:3857'`（Web Mercator 投影坐标，单位米）。SDK 内部自动处理投影转换，适配器层透明。详见[坐标系统](#坐标系统)章节。 |
| `initialView`      | `ViewState`             | ❌  | 初始视图状态（中心点、缩放级别等）。不传则使用引擎默认视图                                                                                         |
| `basemap`          | `BasemapConfig`         | ❌  | 底图配置。不传使用默认底图（2D: OSM，3D: OSM 影像）。传 `{ preset: 'blank' }` 不加载底图                                                       |
| `debug`            | `DebugConfig`           | ❌  | 调试模式配置                                                                                                                |
| `plugins`          | `IPlugin[]`             | ❌  | 初始化时自动注册的插件列表                                                                                                         |

#### ViewState 详细字段

| 字段         | 类型                 | 必填 | 说明                                       |
| ---------- | ------------------ | -- | ---------------------------------------- |
| `center`   | `[number, number]` | ✅  | 地图中心点经纬度坐标 `[经度, 纬度]`                    |
| `zoom`     | `number`           | ❌  | 缩放级别，2D 下通常范围 0\~22，3D 下通过相机高度换算。默认 `4`  |
| `rotation` | `number`           | ❌  | 地图旋转角度（弧度制），仅 2D 模式。`0` = 正北朝上，正值 = 逆时针  |
| `pitch`    | `number`           | ❌  | 相机俯仰角（度），仅 3D 模式。`-90` = 正视（俯视），`0` = 平视 |
| `heading`  | `number`           | ❌  | 相机朝向角（度），仅 3D 模式。`0` = 正北，正值 = 顺时针       |

#### BasemapConfig 详细字段

| 字段        | 类型                 | 默认值     | 说明                                                    |
| --------- | ------------------ | ------- | ----------------------------------------------------- |
| `url`     | `string`           | —       | 自定义瓦片 URL 模板，支持 `{x}/{y}/{z}` 占位符。优先级高于 `preset`      |
| `preset`  | `'osm' \| 'blank'` | `'osm'` | 预设底图类型。`'osm'` = OpenStreetMap 标准瓦片；`'blank'` = 不加载底图 |
| `opacity` | `number`           | `1`     | 底图透明度，取值 0\~1                                         |
| `minZoom` | `number`           | —       | 底图最小可见缩放级别                                            |
| `maxZoom` | `number`           | —       | 底图最大可见缩放级别                                            |

#### DebugConfig 详细字段

| 字段             | 类型                                       | 默认值      | 说明           |
| -------------- | ---------------------------------------- | -------- | ------------ |
| `enabled`      | `boolean`                                | `false`  | 是否启用调试模式     |
| `logLevel`     | `'DEBUG' \| 'INFO' \| 'WARN' \| 'ERROR'` | `'WARN'` | 日志级别         |
| `logAllEvents` | `boolean`                                | `false`  | 是否记录所有事件到控制台 |

***

### MapController 方法

#### 生命周期

| API                             | 说明          | 返回值                      |
| ------------------------------- | ----------- | ------------------------ |
| `MapController.create(options)` | 创建地图实例      | `Promise<MapController>` |
| `map.destroy()`                 | 销毁实例，释放所有资源 | `void`                   |

#### 图层操作

| API                                     | 说明                 | 返回值                       |
| --------------------------------------- | ------------------ | ------------------------- |
| `map.addLayer(config, groupId?)`        | 添加图层               | `string`                  |
| `map.addLayers(configs, groupId?)`      | 批量添加图层             | `string[]`                |
| `map.removeLayer(layerId)`              | 移除图层               | `void`                    |
| `map.setLayerVisible(layerId, visible)` | 设置可见性              | `void`                    |
| `map.setLayerOpacity(layerId, opacity)` | 设置透明度（0\~1）        | `void`                    |
| `map.updateLayerData(layerId, data)`    | **更新矢量图层数据（核心方法）** | `void`                    |
| `map.setGroupVisible(groupId, visible)` | 按分组设置可见性           | `void`                    |
| `map.getLayerState(layerId)`            | 获取图层状态             | `LayerState \| undefined` |
| `map.getLayerStates()`                  | 获取所有图层状态           | `LayerState[]`            |
| `map.exportLayerConfigs()`              | 导出图层配置             | `LayerConfig[]`           |
| `map.importLayerConfigs(configs)`       | 导入图层配置             | `void`                    |

#### 视图控制

| API                  | 说明           | 返回值             |
| -------------------- | ------------ | --------------- |
| `map.setView(state)` | 设置视图（立即跳转）   | `void`          |
| `map.getView()`      | 获取当前视图状态     | `ViewState`     |
| `map.flyTo(options)` | 飞行到目标位置（带动画） | `Promise<void>` |
| `map.getBounds()`    | 获取当前可视范围     | `BoundingBox`   |

#### 自定义数据源

| API                                             | 说明          | 返回值                                 |
| ----------------------------------------------- | ----------- | ----------------------------------- |
| `map.registerCustomDataSource(source)`          | 注册自定义数据源    | `void`                              |
| `map.unregisterCustomDataSource(sourceId)`      | 注销自定义数据源    | `void`                              |
| `map.fetchFromCustomSource(sourceId)`           | 从自定义数据源拉取数据 | `Promise<GeoJSONFeatureCollection>` |
| `map.startCustomDataSource(sourceId, interval)` | 启动定时刷新      | `void`                              |
| `map.stopCustomDataSource(sourceId)`            | 停止定时刷新      | `void`                              |

#### 事件系统

| API                        | 说明            | 返回值          |
| -------------------------- | ------------- | ------------ |
| `map.on(event, handler)`   | 订阅事件，返回取消订阅函数 | `() => void` |
| `map.once(event, handler)` | 订阅一次性事件       | `void`       |
| `map.off(event, handler)`  | 取消订阅          | `void`       |

#### 插件系统

| API                         | 说明      | 返回值             |
| --------------------------- | ------- | --------------- |
| `map.use(plugin, options?)` | 注册并安装插件 | `Promise<void>` |
| `map.unuse(pluginName)`     | 卸载插件    | `void`          |

#### 底层访问

| API                       | 说明       | 返回值        |
| ------------------------- | -------- | ---------- |
| `map.getNativeInstance()` | 获取底层引擎实例 | `unknown`  |
| `map.getEventBus()`       | 获取事件总线   | `EventBus` |

***

## 六、事件列表

| 事件名                 | 常量                            | 说明        |
| ------------------- | ----------------------------- | --------- |
| `map:click`         | `MapEvents.MAP_CLICK`         | 地图单击      |
| `map:dblclick`      | `MapEvents.MAP_DBLCLICK`      | 地图双击      |
| `map:pointermove`   | `MapEvents.MAP_POINTERMOVE`   | 鼠标移动      |
| `map:moveend`       | `MapEvents.MAP_MOVEEND`       | 视图变化完成    |
| `map:contextmenu`   | `MapEvents.MAP_CONTEXTMENU`   | 右键菜单      |
| `feature:click`     | `MapEvents.FEATURE_CLICK`     | 要素点击      |
| `feature:hover`     | `MapEvents.FEATURE_HOVER`     | 要素悬停      |
| `layer:add`         | `MapEvents.LAYER_ADD`         | 图层添加      |
| `layer:remove`      | `MapEvents.LAYER_REMOVE`      | 图层移除      |
| `datasource:update` | `MapEvents.DATASOURCE_UPDATE` | 数据源更新     |
| `system:ready`      | `MapEvents.READY`             | SDK 初始化完成 |

***

## 七、图层类型

| 枚举值                   | 说明            | 引擎          | 必填字段                        |
| --------------------- | ------------- | ----------- | --------------------------- |
| `LayerType.Tile`      | 栅格瓦片（XYZ/TMS） | OL / Cesium | `url`                       |
| `LayerType.WMS`       | OGC WMS 服务    | OL / Cesium | `url`, `layers`             |
| `LayerType.WMTS`      | OGC WMTS 服务   | OL / Cesium | `url`, `layer`, `matrixSet` |
| `LayerType.Vector`    | 矢量要素（GeoJSON） | OL / Cesium | —                           |
| `LayerType.Heatmap`   | 热力图           | OL          | —                           |
| `LayerType.Tileset3D` | 3D Tiles      | Cesium      | `url`                       |
| `LayerType.CZML`      | CZML 动态数据     | Cesium      | `url` 或 `data`              |
| `LayerType.Custom`    | 自定义图层         | 插件扩展        | —                           |

***

## 八、数据源管理

SDK 不暴露内部 HTTP/WebSocket 数据获取能力，外部数据通过以下方式注入：

### 方式一：直接注入

```typescript
map.addLayer({ id: 'targets', type: LayerType.Vector });

const res = await fetch('/api/targets');
const data = await res.json();
map.updateLayerData('targets', data);
```

### 方式二：自定义数据源（支持定时刷新）

```typescript
import type { ICustomDataSource } from '@mapcore/sdk';

const source: ICustomDataSource = {
  id: 'my-targets',
  async fetch() {
    const res = await fetch('/api/targets');
    return res.json();
  },
  dispose() {},
};

map.registerCustomDataSource(source);
map.startCustomDataSource('my-targets', 5000);

map.on('datasource:update', (payload) => {
  if (payload.sourceId === 'my-targets') {
    map.updateLayerData('targets', payload.data);
  }
});
```

***

## 九、插件系统

```typescript
import type { IPlugin, PluginContext } from '@mapcore/sdk';
import { distance } from '@mapcore/sdk';

const measurePlugin: IPlugin = {
  name: 'MeasureTool',
  version: '1.0.0',
  install(ctx: PluginContext) {
    let points: [number, number][] = [];
    ctx.eventBus.on('map:click', (payload: any) => {
      points.push(payload.lngLat);
      if (points.length === 2) {
        const dist = distance(points[0], points[1]);
        ctx.logger.info('MeasureTool', `距离: ${(dist / 1000).toFixed(2)} 公里`);
        points = [];
      }
    });
  },
  uninstall() {},
};

await map.use(measurePlugin);
map.unuse('MeasureTool');
```

### PluginContext 能力

| 能力                      | 说明     |
| ----------------------- | ------ |
| `ctx.layerManager`      | 图层管理器  |
| `ctx.eventBus`          | 事件总线   |
| `ctx.engine`            | 地图引擎   |
| `ctx.logger`            | 日志器    |
| `ctx.dataSourceManager` | 数据源管理器 |

***

## 十、跨端通信桥

```typescript
import { BridgeFactory } from '@mapcore/sdk';

const bridge = BridgeFactory.detect();
await bridge.send('mapReady', { engine: 'openlayers' });
bridge.receive((method, params) => {
  console.log('收到原生消息:', method, params);
});
bridge.destroy();
```

| 桥类型                  | 检测条件                                         | 适用场景            |
| -------------------- | -------------------------------------------- | --------------- |
| `AndroidBridge`      | `window.AndroidBridge` 存在                    | Android WebView |
| `IOSBridge`          | `window.webkit.messageHandlers.mapBridge` 存在 | iOS WKWebView   |
| `QtWebChannelBridge` | `window.qt.webChannelTransport` 存在           | Qt WebEngine    |

***

## 十一、工具函数

```typescript
import { isValidLngLat, distance, bearing, parseColor, withAlpha, Logger, LogLevel } from '@mapcore/sdk';

isValidLngLat([116.397, 39.909]);                          // true
const dist = distance([116.397, 39.909], [121.473, 31.23]); // 米
const angle = bearing([116.397, 39.909], [121.473, 31.23]); // 度
const rgba = parseColor('#ff0000');                          // [255, 0, 0, 1]
const withA = withAlpha('#ff0000', 0.5);                    // 'rgba(255, 0, 0, 0.5)'
const logger = new Logger('MyModule', LogLevel.DEBUG);
```

***

## 十二、Vite 插件选项

`mapEngineSetup()` 是 SDK 提供的 Vite 构建插件，从 `@mapcore/sdk/vite` 子路径导入，自动处理地图引擎所需的构建时配置。

### 导入方式

```typescript
import { mapEngineSetup } from '@mapcore/sdk/vite';
```

### 选项

```typescript
mapEngineSetup({
  cesiumBaseUrl: '/cesium',  // Cesium 静态资源的 URL 路径前缀
  copyCesium: true,          // 是否自动复制 Cesium 静态资源
})
```

| 选项              | 类型        | 默认值         | 说明                                      |
| --------------- | --------- | ----------- | --------------------------------------- |
| `cesiumBaseUrl` | `string`  | `'/cesium'` | Cesium 静态资源（Workers/Assets 等）的 URL 路径前缀 |
| `copyCesium`    | `boolean` | `true`      | 是否将 Cesium 静态资源复制到 `public/` 目录         |

### 插件行为

| 阶段           | 行为                                                      | 条件                              |
| ------------ | ------------------------------------------------------- | ------------------------------- |
| `config`     | 注入 `CESIUM_BASE_URL` define                             | 检测到 `cesium` 包存在时               |
| `buildStart` | 复制 Workers/Assets/ThirdParty/Widgets 到 `public/cesium/` | `copyCesium: true` 且 Cesium 存在时 |
| —            | 全部跳过                                                    | 未安装 `cesium` 时（纯 2D 项目）         |

### 最小配置（2D + 3D 项目）

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { mapEngineSetup } from '@mapcore/sdk/vite';

export default defineConfig({
  plugins: [vue(), mapEngineSetup()],
});
```

### 仅 2D 项目

纯 2D 项目（未安装 `cesium`）同样可以使用此插件，插件会自动检测并跳过所有 Cesium 相关处理，不影响构建性能。

***

## 十三、通用注意事项

| 项目              | 说明                                                                                                                   | <br /> |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | :----- |
| **CSS（自动注入）**   | SDK 在引擎初始化时自动注入 `ol/ol.css`（2D）或 `cesium/widgets.css`（3D）。Vite/Webpack 5 项目无需手动引入；纯 HTML/离线环境 SDK 自动回退为 CDN `<link>` | <br /> |
| **容器尺寸**        | 地图容器 DOM **必须有明确的宽高**（如 `height: 600px`），`height: 0` 或 `display: none` 会导致不渲染                                        | <br /> |
| **底图**          | 默认自动加载（2D: OSM，3D: OSM 影像）。可通过 `basemap` 选项自定义                                                                       | <br /> |
| **坐标系**         | 默认 EPSG:4326（经纬度），可通过 `coordinateSystem: 'EPSG:3857'` 切换为投影坐标（米）。GeoJSON 数据始终使用 EPSG:4326                            | <br /> |
| **Cesium 静态资源** | 3D 模式使用 `mapEngineSetup()` Vite 插件自动处理，无需手动配置。非 Vite 项目需手动复制 Workers/Assets/Widgets 并配置 `CESIUM_BASE_URL`            | <br /> |
| **TypeScript**  | SDK 包含完整类型定义（`.d.ts`），无需额外安装 `@types/` 包                                                                             | <br /> |
| **销毁**          | 页面/组件卸载时必须调用 `map.destroy()` 释放资源                                                                                    | <br /> |

