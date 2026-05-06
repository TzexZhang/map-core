/**
 * @file 接口定义统一导出入口
 * @description 将所有接口定义模块统一导出。
 * @module MapCore.Interfaces
 */

export type { IMapEngine } from './IMapEngine';
export type { ILayer, ILayerManager } from './ILayer';
export type { IDataSource, IDataSourceManager } from './IDataSource';
export type { IBridge, BridgeMessage, PromiseResolver } from './IBridge';
