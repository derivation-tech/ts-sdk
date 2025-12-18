import type { Demo } from './types';

/**
 * Global demo registry.
 * Demos register themselves when their module is imported.
 */
export const demoRegistry = new Map<string, Demo>();

/**
 * Register a demo in the global registry.
 */
export function registerDemo(demo: Demo): void {
    if (demoRegistry.has(demo.name)) {
        throw new Error(`Demo "${demo.name}" is already registered`);
    }
    demoRegistry.set(demo.name, demo);
}

/**
 * Get a demo by name.
 */
export function getDemo(name: string): Demo | undefined {
    return demoRegistry.get(name);
}

/**
 * List all registered demos, optionally filtered by category.
 */
export function listDemos(category?: string): Demo[] {
    const demos = Array.from(demoRegistry.values());
    if (category) {
        return demos.filter((demo) => demo.category === category);
    }
    return demos;
}

/**
 * Get all demo names.
 */
export function getDemoNames(): string[] {
    return Array.from(demoRegistry.keys());
}
