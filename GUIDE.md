# MapCore SDK 操作说明文档

## 环境要求

| 工具     | 版本要求                |
| -------- | ----------------------- |
| Node.js  | >= 18.0.0               |
| pnpm     | >= 8.0.0                |
| 操作系统 | Windows / macOS / Linux |

---

## 一、项目安装

### 1.1 安装 pnpm（如未安装）

```bash
npm install -g pnpm@8
```

### 1.2 克隆项目并安装依赖

```bash
cd d:\project\MapCore

# 安装所有子包依赖（pnpm workspace 自动关联）
pnpm install
```

安装完成后项目结构：

```
d:\project\MapCore\
├── .env                    # 默认环境配置
├── .env.development        # 开发环境配置
├── .env.production         # 生产环境配置
├── package.json            # 根项目配置
├── tsconfig.base.json      # TypeScript 基础配置
├── turbo.json              # Turborepo 构建编排
├── pnpm-workspace.yaml     # pnpm 工作区配置
└── packages/
    ├── core/               # 核心包（类型、接口、工具）
    ├── adapter-ol/         # OpenLayers 2D 引擎适配器
    ├── adapter-cesium/     # Cesium 3D 引擎适配器
    ├── datasource/         # 数据源管理
    ├── bridge/             # 跨端通信桥
    └── sdk/                # 聚合包（对外发布入口）
```

---

## 二、环境配置

### 2.1 配置瓦片资源地址

编辑项目根目录下的 `.env` 文件：

```bash
# .env（默认配置）
MAPCORE_TILE_BASE=https://tile.openstreetmap.org/{z}/{x}/{y}.png
MAPCORE_CESIUM_ION=null
```

开发环境使用 `.env.development`（在线资源），生产环境使用 `.env.production`（内网地址）：

```bash
# .env.production（生产环境示例）
MAPCORE_TILE_BASE=http://192.168.10.5:8080/tiles/{z}/{x}/{y}.png
MAPCORE_CESIUM_BASE_URL=http://192.168.10.5:8080/cesium
MAPCORE_CESIUM_ION=null
MAPCORE_TERRAIN_URL=http://192.168.10.5:8080/terrain
```

### 2.2 配置变量说明

| 变量                      | 必填      | 说明                         |
| ------------------------- | --------- | ---------------------------- |
| `MAPCORE_TILE_BASE`       | 是        | 默认瓦片底图地址             |
| `MAPCORE_SATELLITE_URL`   | 否        | 卫星影像瓦片地址             |
| `MAPCORE_WMS_URL`         | 否        | WMS 服务地址                 |
| `MAPCORE_CESIUM_BASE_URL` | 3D 时必填 | Cesium 静态资源路径          |
| `MAPCORE_CESIUM_ION`      | 否        | Cesium Ion 地址，`null` 禁用 |
| `MAPCORE_TERRAIN_URL`     | 否        | 地形服务地址                 |
| `MAPCORE_TILESET3D_URL`   | 否        | 3D Tiles 服务路径            |
| `MAPCORE_GEOSERVER_URL`   | 否        | GeoServer 地址               |

---

## 三、构建与运行

### 3.1 全量构建

```bash
# 构建所有子包（按依赖顺序自动编排）
pnpm build
```

构建产物在 `packages/*/dist/` 目录下。

### 3.2 类型检查

```bash
# 检查所有文件的 TypeScript 类型
pnpm type-check
```

### 3.3 代码检查

```bash
# ESLint 检查
pnpm lint

# ESLint 自动修复
pnpm lint:fix

# Prettier 格式化
pnpm format
```

### 3.4 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式（开发时使用）
pnpm test:watch
```

### 3.5 清理构建产物

```bash
# 清理所有子包的 dist 目录
pnpm clean
```

---

## 四、开发流程

### 4.1 典型开发流程

```bash
# 1. 安装依赖
pnpm install

# 2. 配置 .env 文件（设置瓦片资源地址）

# 3. 启动类型检查（监听模式，另开终端）
pnpm type-check

# 4. 开发代码...

# 5. 运行测试
pnpm test

# 6. 代码检查
pnpm lint:fix

# 7. 构建
pnpm build
```

### 4.2 修改代码后

修改 `packages/core/src/` 下的代码后：

```bash
# 重新构建 core 包
cd packages/core
pnpm build

# 回到根目录重新构建依赖 core 的包
cd ../..
pnpm build
```

使用 Turborepo 会自动检测变更，只重新构建受影响的包。

---

## 五、在业务项目中使用

### 5.1 方式一：直接引用源码（开发阶段）

在业务项目的 `package.json` 中：

```json
{
  "dependencies": {
    "@mapcore/sdk": "file:../MapCore/packages/sdk"
  }
}
```

### 5.2 方式二：引用构建产物

```bash
# 先在 SDK 项目中构建
cd d:\project\MapCore
pnpm build

# 在业务项目中引入构建产物
cp -r packages/sdk/dist/ /your-project/libs/mapcore/
```

### 5.3 使用示例

```typescript
import { MapController, EngineType, LayerType } from '@mapcore/sdk';

const map = await MapController.create({
  container: 'map-container',
  engine: EngineType.OpenLayers,
  initialView: { center: [116.397, 39.909], zoom: 10 },
});

// 添加底图（URL 使用占位符，从 .env 自动注入）
map.addLayer({
  id: 'base',
  type: LayerType.Tile,
  url: '{{env:TILE_BASE}}',
});

// 添加矢量图层 + 外部数据
map.addLayer({ id: 'targets', type: LayerType.Vector });
const data = await fetch('/api/targets').then((r) => r.json());
map.updateLayerData('targets', data);
```

---

## 六、常见问题

### Q1: `pnpm install` 报错找不到 ol / cesium

**原因**：`ol` 和 `cesium` 是 peerDependencies，需要手动安装。

```bash
cd packages/adapter-ol && pnpm install
cd packages/adapter-cesium && pnpm install
```

### Q2: 类型检查报错

```bash
# 确保所有依赖包已构建
pnpm build

# 然后重新检查
pnpm type-check
```

### Q3: 构建报错循环依赖

```bash
# 清理后重新构建
pnpm clean
pnpm build
```

### Q4: 瓦片加载不出来

检查 `.env` 文件中的瓦片地址是否正确：

- 地址需包含 `{z}/{x}/{y}` 占位符
- 内网地址确保网络可达
- 检查浏览器控制台的网络请求

---

## 七、脚本命令速查

| 命令              | 说明                |
| ----------------- | ------------------- |
| `pnpm install`    | 安装所有依赖        |
| `pnpm build`      | 构建所有子包        |
| `pnpm test`       | 运行测试            |
| `pnpm test:watch` | 监听模式运行测试    |
| `pnpm lint`       | ESLint 检查         |
| `pnpm lint:fix`   | ESLint 自动修复     |
| `pnpm format`     | Prettier 格式化     |
| `pnpm type-check` | TypeScript 类型检查 |
| `pnpm clean`      | 清理构建产物        |
