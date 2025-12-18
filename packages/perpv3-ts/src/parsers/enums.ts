export const CONDITION_LABELS = ['NORMAL', 'FROZEN', 'RESOLVED'] as const;
export const STATUS_LABELS = ['DORMANT', 'TRADING', 'SETTLING', 'SETTLED'] as const;
export const FEEDER_TYPE_LABELS = ['NONE_STABLE', 'QUOTE_STABLE', 'BASE_STABLE', 'BOTH_STABLE'] as const;
export const QUOTE_TYPE_LABELS = ['INVALID', 'STABLE', 'NONSTABLE'] as const;

export function formatCondition(value: number | bigint): string {
    const index = Number(value);
    return CONDITION_LABELS[index] ?? index.toString();
}

export function formatStatus(value: number | bigint): string {
    const index = Number(value);
    return STATUS_LABELS[index] ?? index.toString();
}

export function formatFeederType(value: number | bigint): string {
    const index = Number(value);
    return FEEDER_TYPE_LABELS[index] ?? index.toString();
}

export function formatQuoteType(value: number | bigint): string {
    const index = Number(value);
    return QUOTE_TYPE_LABELS[index] ?? index.toString();
}
