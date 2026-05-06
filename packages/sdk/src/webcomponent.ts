/**
 * @file WebComponent 封装实现
 * @description 使用原生 Custom Elements API 封装 MapCore 为 HTML 自定义元素 `<map-core>`。
 *              无框架依赖，可在任意 HTML / React / Vue / Angular 中使用。
 *
 * 使用方式：
 * ```html
 * <map-core engine="openlayers" center="116.4,39.9" zoom="10"></map-core>
 * <script>
 *   const mapEl = document.querySelector('map-core');
 *   const controller = mapEl.mapController;
 *   controller.addLayer({ id: 'base', type: 'tile', url: '...' });
 * </script>
 * ```
 *
 * @module MapCore.SDK.WebComponent
 */

import { MapController, EngineType } from './index';
import type { MapCoreOptions } from '@mapcore/core';

/**
 * MapCoreElement 自定义 HTML 元素
 * @description 将 MapController 封装为 Web Component，支持通过 HTML 属性配置地图。
 *
 * 支持的 HTML 属性：
 * - engine：引擎类型（"openlayers" 或 "cesium"）
 * - center：初始中心点（"经度,纬度" 格式）
 * - zoom：初始缩放级别
 * - pitch：初始俯仰角（3D）
 * - heading：初始朝向角（3D）
 *
 * 属性变化时会自动更新地图状态（响应式）。
 */
export class MapCoreElement extends HTMLElement {
  /** MapController 实例，初始化后赋值 */
  private controller: MapController | null = null;

  /** 是否正在初始化（防止重复初始化） */
  private initializing: boolean = false;

  /**
   * 定义需要监听变化的 HTML 属性列表
   * @returns 属性名称数组
   */
  static get observedAttributes(): string[] {
    return ['engine', 'center', 'zoom', 'pitch', 'heading'];
  }

  /**
   * 元素挂载到 DOM 时调用
   * @description 读取 HTML 属性配置，创建 MapController 实例。
   */
  async connectedCallback(): Promise<void> {
    if (this.initializing || this.controller) return;
    this.initializing = true;

    try {
      const options = this.parseAttributes();
      this.controller = await MapController.create(options);

      this.dispatchEvent(
        new CustomEvent('map-ready', {
          bubbles: true,
          detail: { controller: this.controller },
        })
      );
    } catch (error) {
      this.dispatchEvent(
        new CustomEvent('map-error', {
          bubbles: true,
          detail: { error },
        })
      );
      console.error('[map-core] 初始化失败:', error);
    } finally {
      this.initializing = false;
    }
  }

  /**
   * 元素从 DOM 移除时调用
   * @description 销毁 MapController 实例，释放资源。
   */
  disconnectedCallback(): void {
    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
    }
  }

  /**
   * 监听的属性发生变化时调用
   * @description 根据变化的属性更新地图状态。
   * @param name - 属性名
   * @param _oldValue - 旧值
   * @param newValue - 新值
   */
  attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
    if (!this.controller) return;

    switch (name) {
      case 'center': {
        const center = this.parseCenter(newValue);
        if (center) {
          void this.controller.flyTo({ center, duration: 500 });
        }
        break;
      }
      case 'zoom': {
        const zoom = parseInt(newValue, 10);
        if (!isNaN(zoom)) {
          this.controller.setView({ zoom });
        }
        break;
      }
      case 'pitch': {
        const pitch = parseFloat(newValue);
        if (!isNaN(pitch)) {
          this.controller.setView({ pitch });
        }
        break;
      }
      case 'heading': {
        const heading = parseFloat(newValue);
        if (!isNaN(heading)) {
          this.controller.setView({ heading });
        }
        break;
      }
    }
  }

  /**
   * 获取 MapController 实例（供 JS 操作）
   * @returns MapController 实例或 null
   */
  get mapController(): MapController | null {
    return this.controller;
  }

  /**
   * 解析 HTML 属性为 MapCoreOptions
   * @returns SDK 初始化配置
   */
  private parseAttributes(): MapCoreOptions {
    const engineAttr = this.getAttribute('engine') ?? 'openlayers';
    const centerAttr = this.getAttribute('center');
    const zoomAttr = this.getAttribute('zoom');
    const pitchAttr = this.getAttribute('pitch');
    const headingAttr = this.getAttribute('heading');

    const engine = engineAttr === 'cesium' ? EngineType.Cesium : EngineType.OpenLayers;

    const options: MapCoreOptions = {
      container: this,
      engine,
    };

    const center = centerAttr ? this.parseCenter(centerAttr) : undefined;
    const zoom = zoomAttr ? parseInt(zoomAttr, 10) : undefined;
    const pitch = pitchAttr ? parseFloat(pitchAttr) : undefined;
    const heading = headingAttr ? parseFloat(headingAttr) : undefined;

    if (center ?? (zoom !== undefined || pitch !== undefined || heading !== undefined)) {
      options.initialView = {
        center: center ?? [116.397428, 39.90923],
        zoom: !isNaN(zoom as number) ? (zoom as number) : 4,
        pitch: !isNaN(pitch as number) ? pitch : undefined,
        heading: !isNaN(heading as number) ? heading : undefined,
      };
    }

    return options;
  }

  /**
   * 解析中心点字符串为 LngLat
   * @param value - "经度,纬度" 格式的字符串
   * @returns LngLat 或 null
   */
  private parseCenter(value: string): [number, number] | null {
    const parts = value.split(',').map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]];
    }
    return null;
  }
}

/**
 * 注册 map-core 自定义元素
 * @description 在浏览器中注册 <map-core> 自定义元素。
 *              如果浏览器不支持 Custom Elements API，会在控制台输出警告。
 */
export function registerMapCoreElement(): void {
  if (typeof customElements === 'undefined') {
    console.warn('[MapCore] 当前浏览器不支持 Custom Elements API');
    return;
  }

  if (!customElements.get('map-core')) {
    customElements.define('map-core', MapCoreElement);
  }
}

// 自动注册（脚本加载后自动执行）
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  registerMapCoreElement();
}
