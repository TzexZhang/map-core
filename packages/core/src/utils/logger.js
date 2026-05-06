/**
 * @file 日志工具
 * @description 提供分级日志功能，支持 DEBUG / INFO / WARN / ERROR 四个级别。
 *              生产环境默认关闭 DEBUG/INFO 级别。仅内部使用，不暴露外部处理器接口。
 * @module MapCore.Utils.Logger
 */
/**
 * 日志级别枚举
 * @description 日志严重性从低到高排列：DEBUG < INFO < WARN < ERROR。
 *              设置某级别后，仅输出该级别及更高级别的日志。
 */
export var LogLevel;
(function (LogLevel) {
    /** 调试级别，输出详细的调试信息 */
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    /** 信息级别，输出一般运行信息 */
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    /** 警告级别，输出潜在问题提示 */
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    /** 错误级别，输出错误和异常信息 */
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    /** 静默模式，不输出任何日志 */
    LogLevel[LogLevel["SILENT"] = 4] = "SILENT";
})(LogLevel || (LogLevel = {}));
/**
 * 日志工具类
 * @description SDK 内部统一日志管理工具。通过 setLevel() 控制日志输出级别。
 *              每条日志携带模块名和时间戳信息。
 *
 * @example
 * ```typescript
 * const logger = new Logger('MapCore');
 * logger.setLevel(LogLevel.DEBUG);
 * logger.info('LayerManager', '图层已添加', { layerId: 'base-tile' });
 * ```
 */
export class Logger {
    /**
     * 创建日志器实例
     * @param prefix - 日志器名称前缀，通常为模块名
     */
    constructor(prefix = 'MapCore') {
        /** 当前日志级别，默认 INFO */
        this.level = LogLevel.INFO;
        this.prefix = prefix;
    }
    /**
     * 设置日志输出级别
     * @param level - 目标日志级别
     */
    setLevel(level) {
        this.level = level;
    }
    /**
     * 获取当前日志级别
     * @returns 当前日志级别
     */
    getLevel() {
        return this.level;
    }
    /**
     * 输出 DEBUG 级别日志
     * @param module - 模块名称
     * @param message - 日志消息
     * @param data - 附加数据（可选）
     */
    debug(module, message, data) {
        this.log(LogLevel.DEBUG, module, message, data);
    }
    /**
     * 输出 INFO 级别日志
     * @param module - 模块名称
     * @param message - 日志消息
     * @param data - 附加数据（可选）
     */
    info(module, message, data) {
        this.log(LogLevel.INFO, module, message, data);
    }
    /**
     * 输出 WARN 级别日志
     * @param module - 模块名称
     * @param message - 日志消息
     * @param data - 附加数据（可选）
     */
    warn(module, message, data) {
        this.log(LogLevel.WARN, module, message, data);
    }
    /**
     * 输出 ERROR 级别日志
     * @param module - 模块名称
     * @param message - 日志消息
     * @param error - 错误对象（可选）
     */
    error(module, message, error) {
        this.log(LogLevel.ERROR, module, message, error);
    }
    /**
     * 核心日志输出方法
     * @param level - 日志级别
     * @param module - 模块名称
     * @param message - 日志消息
     * @param data - 附加数据
     */
    log(level, module, message, data) {
        if (level < this.level) {
            return;
        }
        const levelName = LogLevel[level];
        const prefix = `[${this.prefix}:${module}]`;
        const formattedMessage = `${prefix} ${levelName}: ${message}`;
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(formattedMessage, data ?? '');
                break;
            case LogLevel.INFO:
                console.info(formattedMessage, data ?? '');
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage, data ?? '');
                break;
            case LogLevel.ERROR:
                console.error(formattedMessage, data ?? '');
                break;
        }
    }
}
/**
 * 创建子日志器
 * @param parent - 父日志器实例
 * @param prefix - 子日志器名称前缀
 * @returns 新的 Logger 实例
 */
export function createChildLogger(parent, prefix) {
    const child = new Logger(prefix);
    child.setLevel(parent.getLevel());
    return child;
}
//# sourceMappingURL=logger.js.map