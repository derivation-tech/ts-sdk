import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { ConsoleLogger, LoggerFactory, LogLevel, type BaseLogger } from '../src/utils/logger';

function logger(): BaseLogger {
    return {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        setLevel: jest.fn(),
        setTimestamp: jest.fn(),
    };
}

afterEach(() => {
    LoggerFactory.clear();
    LoggerFactory.setDefaultLevel(LogLevel.Info);
    LoggerFactory.setTimestampEnabled(false);
    jest.restoreAllMocks();
});

describe('logger injection', () => {
    test('uses a named injection across levels without mutating its settings', () => {
        const injected = logger();
        LoggerFactory.setLogger('worker', injected);
        LoggerFactory.setDefaultLevel(LogLevel.Debug);
        LoggerFactory.setTimestampEnabled(true);
        for (const level of [undefined, LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error]) {
            expect(LoggerFactory.getLogger('worker', level)).toBe(injected);
        }
        LoggerFactory.getLogger('worker').info('submitted');
        expect(injected.info).toHaveBeenCalledWith('submitted');
        expect(injected.setLevel).not.toHaveBeenCalled();
        expect(injected.setTimestamp).not.toHaveBeenCalled();
    });

    test('overrides previously cached defaults and can replace an injection', () => {
        const original = LoggerFactory.getLogger('worker');
        const injected = logger();
        LoggerFactory.setLogger('worker', injected);
        expect(LoggerFactory.getLogger('worker')).toBe(injected);
        expect(LoggerFactory.getLogger('worker')).not.toBe(original);
        const replacement = logger();
        LoggerFactory.setLogger('worker', replacement);
        expect(LoggerFactory.getLogger('worker')).toBe(replacement);
    });

    test('does not confuse injected names with generated level-cache keys', () => {
        const injected = logger();
        LoggerFactory.setLogger('worker-1', injected);
        expect(LoggerFactory.getLogger('worker-1')).toBe(injected);
        expect(LoggerFactory.getLogger('worker', LogLevel.Info)).toBeInstanceOf(ConsoleLogger);
        expect(LoggerFactory.getLogger('another')).not.toBe(injected);
    });

    test('clears both injection and generated instances', () => {
        const generated = LoggerFactory.getLogger('default');
        const injected = logger();
        LoggerFactory.setLogger('worker', injected);
        LoggerFactory.clear();
        expect(LoggerFactory.getLogger('worker')).toBeInstanceOf(ConsoleLogger);
        expect(LoggerFactory.getLogger('worker')).not.toBe(injected);
        expect(LoggerFactory.getLogger('default')).not.toBe(generated);
    });

    test('preserves generated logger caching and configured output levels', () => {
        const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        LoggerFactory.setDefaultLevel(LogLevel.Error);
        const generated = LoggerFactory.getLogger('default');
        generated.info('hidden');
        generated.error('visible');
        expect(info).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledWith('[default]', 'visible');
        expect(LoggerFactory.getLogger('default')).toBe(generated);
        expect(LoggerFactory.getLogger('default', LogLevel.Info)).not.toBe(generated);
    });
});
