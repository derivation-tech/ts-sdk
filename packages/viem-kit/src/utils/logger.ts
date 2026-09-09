// ==========================================
// LOGGER TYPES
// ==========================================

export enum LogLevel {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3,
}

export interface BaseLogger {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    setLevel?(level: LogLevel): void;
    setTimestamp?(enable: boolean): void;
}

// ==========================================
// LOGGER IMPLEMENTATION
// ==========================================

/**
 * Console logger with log levels and timestamps
 */
export class ConsoleLogger implements BaseLogger {
    constructor(
        private name: string,
        private level: LogLevel = LogLevel.Info,
        private enableTimestamp: boolean = false
    ) {}

    private getTimestamp(): string {
        return this.enableTimestamp ? `[${new Date().toISOString()}] ` : '';
    }

    private shouldLog(level: LogLevel): boolean {
        return this.level <= level;
    }

    private getPrefix(): string {
        return `${this.getTimestamp()}[${this.name}]`;
    }

    debug(...args: unknown[]): void {
        if (this.shouldLog(LogLevel.Debug)) {
            console.debug(this.getPrefix(), ...args);
        }
    }

    info(...args: unknown[]): void {
        if (this.shouldLog(LogLevel.Info)) {
            console.info(this.getPrefix(), ...args);
        }
    }

    warn(...args: unknown[]): void {
        if (this.shouldLog(LogLevel.Warn)) {
            console.warn(this.getPrefix(), ...args);
        }
    }

    error(...args: unknown[]): void {
        if (this.shouldLog(LogLevel.Error)) {
            console.error(this.getPrefix(), ...args);
        }
    }

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    setTimestamp(enable: boolean): void {
        this.enableTimestamp = enable;
    }
}

/**
 * Logger factory with singleton pattern
 */
export class LoggerFactory {
    private static loggers: Map<string, BaseLogger> = new Map();
    private static injectedLoggers: Map<string, BaseLogger> = new Map();
    private static defaultLevel: LogLevel = LogLevel.Info;
    private static enableTimestamp: boolean = false;

    static getLogger(name: string, level?: LogLevel): BaseLogger {
        const injected = this.injectedLoggers.get(name);
        if (injected) return injected;
        const logLevel = level ?? this.defaultLevel;
        const key = `${name}-${logLevel}`;

        if (!this.loggers.has(key)) {
            this.loggers.set(key, new ConsoleLogger(name, logLevel, this.enableTimestamp));
        }
        return this.loggers.get(key)!;
    }

    static setLogger(name: string, logger: BaseLogger): void {
        this.injectedLoggers.set(name, logger);
    }

    static setDefaultLevel(level: LogLevel): void {
        this.defaultLevel = level;
    }

    static setTimestampEnabled(enable: boolean): void {
        this.enableTimestamp = enable;
    }

    static clear(): void {
        this.loggers.clear();
        this.injectedLoggers.clear();
    }
}
