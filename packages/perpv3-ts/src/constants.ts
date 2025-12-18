// Native bigint equivalents of the legacy math constants.

export const ZERO = 0n;
export const ONE = 1n;
export const TWO = 2n;

export const Q24 = ONE << 24n;
export const Q32 = ONE << 32n;
export const Q96 = ONE << 96n;
export const WAD = 10n ** 18n;
export const WAD_DECIMALS = 18;

export const MAX_UINT_256 = (ONE << 256n) - ONE;
export const MAX_UINT_160 = (ONE << 160n) - ONE;
export const MAX_UINT_128 = (ONE << 128n) - ONE;
export const MAX_UINT_64 = (ONE << 64n) - ONE;
export const MAX_UINT_48 = (ONE << 48n) - ONE;
export const MAX_UINT_32 = (ONE << 32n) - ONE;
export const MAX_UINT_24 = (ONE << 24n) - ONE;
export const MAX_UINT_16 = (ONE << 16n) - ONE;
export const MAX_UINT_8 = (ONE << 8n) - ONE;

export const MAX_INT_24 = (ONE << 23n) - ONE;
export const MIN_INT_24 = -(ONE << 23n);

export const POWERS_OF_2: Array<[number, bigint]> = [128, 64, 32, 16, 8, 4, 2, 1].map((pow) => [
    pow,
    ONE << BigInt(pow),
]);

export const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

export const EMPTY_TICK = (ONE << 23n) - ONE;

// Ratio helpers mirrored from the legacy implementation.
export const RATIO_DECIMALS = 4;
export const ONE_RATIO = 10n ** BigInt(RATIO_DECIMALS);
export const RATIO_BASE = 10_000;

export const RATIO_SCALER = WAD / ONE_RATIO;

export const MIN_BATCH_ORDER_COUNT = 2;
export const MAX_BATCH_ORDER_COUNT = 9;

export const SECS_PER_DAY = 86_400;

// Default values
export const DEFAULT_DEADLINE_SECONDS = 600; // 10 minutes default deadline
export const DEFAULT_SLIPPAGE_BPS = 50; // 0.5% default slippage tolerance
export const DEFAULT_FUNDING_HOUR = 24; // 24 hours default funding interval

// Tick constants
export const MIN_TICK = -322517;
export const MAX_TICK = 443636;
export const MIN_SQRT_RATIO = BigInt('7867958450021363558555');
export const MAX_SQRT_RATIO = BigInt('340275971719517849884101479065584693834');
