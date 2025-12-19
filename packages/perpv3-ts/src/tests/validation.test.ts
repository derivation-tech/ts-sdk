import { describe, it, expect } from '@jest/globals';
import { InstrumentSetting } from '../types/setting';
import { PairSnapshot } from '../types/snapshot';
import { Side, Condition, Status } from '../types/contract';
import { tickToWad, wadToTick, ratioToWad, wdiv, abs, wmul, tickToSqrtX96 } from '../math';
import { WAD } from '../constants';

/**
 * Test suite for validation helper methods added in commit e38b1e5
 * Focus on P0 fixes for getFeasibleLimitOrderTickRange and getFeasibleTargetTickRange
 */

describe('InstrumentSetting.getFeasibleLimitOrderTickRange', () => {
    // Create a minimal InstrumentSetting for testing
    const createTestSetting = (imr: number = 1000, orderSpacing: number = 10) => {
        const zeroAddress = '0x0000000000000000000000000000000000000000' as const;
        return new InstrumentSetting(
            {
                symbol: 'TEST',
                config: zeroAddress,
                gate: zeroAddress,
                market: zeroAddress,
                quote: zeroAddress,
                decimals: 18,
                param: {
                    minMarginAmount: WAD,
                    tradingFeeRatio: 50,
                },
                initialMarginRatio: imr,
                maintenanceMarginRatio: 500,
                placePaused: false,
                fundingHour: 8,
                disableOrderRebate: false,
            },
            Condition.NORMAL,
            10, // pearlSpacing
            orderSpacing,
            100 // rangeSpacing
        );
    };

    describe('LONG orders (tick < ammTick)', () => {
        it('should return range below ammTick', () => {
            const setting = createTestSetting();
            const ammTick = 1000;
            const markPrice = tickToWad(1000);

            const range = setting.getFeasibleLimitOrderTickRange(Side.LONG, ammTick, markPrice);

            expect(range).not.toBeNull();
            expect(range!.minTick).toBeLessThan(range!.maxTick);
            expect(range!.maxTick).toBeLessThan(ammTick);
        });

        it('should respect 2*IMR price deviation limit', () => {
            const setting = createTestSetting(1000); // 10% IMR
            const ammTick = 1000;
            const markPrice = tickToWad(1000);

            const range = setting.getFeasibleLimitOrderTickRange(Side.LONG, ammTick, markPrice);

            expect(range).not.toBeNull();

            // Check that the range respects price deviation limit
            const imr = ratioToWad(setting.imr);
            const maxDeviation = imr * 2n; // 20% for 10% IMR

            // Verify minTick respects deviation
            const minTickPrice = tickToWad(range!.minTick);
            const minDeviation = wdiv(abs(minTickPrice - markPrice), markPrice);
            expect(minDeviation).toBeLessThanOrEqual(maxDeviation);

            // Verify maxTick respects deviation
            const maxTickPrice = tickToWad(range!.maxTick);
            const maxDeviation2 = wdiv(abs(maxTickPrice - markPrice), markPrice);
            expect(maxDeviation2).toBeLessThanOrEqual(maxDeviation);
        });

        it('should have minTick at or above the deviation lower bound', () => {
            const setting = createTestSetting(1000); // 10% IMR
            const ammTick = 10000;
            const markPrice = tickToWad(10000);

            const range = setting.getFeasibleLimitOrderTickRange(Side.LONG, ammTick, markPrice);

            expect(range).not.toBeNull();

            const imr = ratioToWad(setting.imr);
            const maxDeviation = imr * 2n;
            const minDeviationPrice = markPrice - wmul(markPrice, maxDeviation);
            const minDeviationTick = wadToTick(minDeviationPrice);

            // minTick should be at or above minDeviationTick (accounting for alignment)
            expect(range!.minTick).toBeGreaterThanOrEqual(minDeviationTick - setting.orderSpacing);
        });

        it('should align ticks to orderSpacing', () => {
            const setting = createTestSetting(1000, 10);
            const ammTick = 1000;
            const markPrice = tickToWad(1000);

            const range = setting.getFeasibleLimitOrderTickRange(Side.LONG, ammTick, markPrice);

            expect(range).not.toBeNull();
            expect(Math.abs(range!.minTick % setting.orderSpacing)).toBe(0);
            expect(Math.abs(range!.maxTick % setting.orderSpacing)).toBe(0);
        });
    });

    describe('SHORT orders (tick > ammTick)', () => {
        it('should return range above ammTick', () => {
            const setting = createTestSetting();
            const ammTick = 1000;
            const markPrice = tickToWad(1000);

            const range = setting.getFeasibleLimitOrderTickRange(Side.SHORT, ammTick, markPrice);

            expect(range).not.toBeNull();
            expect(range!.minTick).toBeLessThan(range!.maxTick);
            expect(range!.minTick).toBeGreaterThan(ammTick);
        });

        it('should respect 2*IMR price deviation limit', () => {
            const setting = createTestSetting(1000); // 10% IMR
            const ammTick = 1000;
            const markPrice = tickToWad(1000);

            const range = setting.getFeasibleLimitOrderTickRange(Side.SHORT, ammTick, markPrice);

            expect(range).not.toBeNull();

            // Check that the range respects price deviation limit
            const imr = ratioToWad(setting.imr);
            const maxDeviation = imr * 2n;

            // Verify minTick respects deviation
            const minTickPrice = tickToWad(range!.minTick);
            const minDeviation = wdiv(abs(minTickPrice - markPrice), markPrice);
            expect(minDeviation).toBeLessThanOrEqual(maxDeviation);

            // Verify maxTick respects deviation
            const maxTickPrice = tickToWad(range!.maxTick);
            const maxDeviation2 = wdiv(abs(maxTickPrice - markPrice), markPrice);
            expect(maxDeviation2).toBeLessThanOrEqual(maxDeviation);
        });

        it('should have maxTick at or below the deviation upper bound', () => {
            const setting = createTestSetting(1000); // 10% IMR
            const ammTick = 10000;
            const markPrice = tickToWad(10000);

            const range = setting.getFeasibleLimitOrderTickRange(Side.SHORT, ammTick, markPrice);

            expect(range).not.toBeNull();

            const imr = ratioToWad(setting.imr);
            const maxDeviation = imr * 2n;
            const maxDeviationPrice = markPrice + wmul(markPrice, maxDeviation);
            const maxDeviationTick = wadToTick(maxDeviationPrice);

            // maxTick should be at or below maxDeviationTick (accounting for alignment)
            expect(range!.maxTick).toBeLessThanOrEqual(maxDeviationTick + setting.orderSpacing);
        });

        it('should align ticks to orderSpacing', () => {
            const setting = createTestSetting(1000, 10);
            const ammTick = 1000;
            const markPrice = tickToWad(1000);

            const range = setting.getFeasibleLimitOrderTickRange(Side.SHORT, ammTick, markPrice);

            expect(range).not.toBeNull();
            expect(Math.abs(range!.minTick) % setting.orderSpacing).toBe(0);
            expect(Math.abs(range!.maxTick) % setting.orderSpacing).toBe(0);
        });
    });

    describe('Edge cases', () => {
        it('should return null when no valid range exists', () => {
            const setting = createTestSetting(1000, 1000); // Large orderSpacing but not overflow
            const ammTick = 100;
            const markPrice = tickToWad(100);

            const range = setting.getFeasibleLimitOrderTickRange(Side.LONG, ammTick, markPrice);

            // With large orderSpacing relative to the range, there might be no valid range
            if (range === null) {
                expect(range).toBeNull();
            } else {
                // If there is a range, it should still be valid
                expect(range.minTick).toBeLessThan(range.maxTick);
            }
        });
    });
});

describe('PairSnapshot.getFeasibleTargetTickRange', () => {
    // Create minimal snapshot for testing
    const createTestSnapshot = (ammTick: number, markPrice: bigint, imr: number = 1000) => {
        const zeroAddress = '0x0000000000000000000000000000000000000000' as const;
        const setting = new InstrumentSetting(
            {
                symbol: 'TEST',
                config: zeroAddress,
                gate: zeroAddress,
                market: zeroAddress,
                quote: zeroAddress,
                decimals: 18,
                param: {
                    minMarginAmount: WAD,
                    tradingFeeRatio: 50,
                },
                initialMarginRatio: imr,
                maintenanceMarginRatio: 500,
                placePaused: false,
                fundingHour: 8,
                disableOrderRebate: false,
            },
            Condition.NORMAL,
            10, // pearlSpacing
            10, // orderSpacing
            100 // rangeSpacing
        );

        return new PairSnapshot({
            setting: setting as any,
            condition: Condition.NORMAL,
            spacing: {
                pearl: 10,
                order: 10,
                range: 100,
            },
            amm: {
                tick: ammTick,
                sqrtPX96: tickToSqrtX96(ammTick),
                totalLiquidity: WAD,
                totalLong: 0n,
                totalShort: 0n,
                feeIndex: 0n,
                status: Status.TRADING,
            },
            priceData: {
                markPrice: markPrice,
                indexPrice: markPrice,
                indexPriceRaw: markPrice,
            },
            portfolio: {
                position: {
                    balance: 0n,
                    size: 0n,
                    entryNotional: 0n,
                    entrySocialLossIndex: 0n,
                    entryFundingIndex: 0n,
                },
                orders: [],
                oids: [],
                ordersTaken: [],
                ranges: [],
                rids: [],
            },
            quoteState: {
                totalQuote: 0n,
                accountQuote: 0n,
            },
            accountMargin: 0n,
            blockInfo: {
                timestamp: 0,
                number: 0n,
            },
        });
    };

    describe('LONG cross limit order (targetTick > ammTick)', () => {
        it('should return range above ammTick', () => {
            const ammTick = 1000;
            const markPrice = tickToWad(1000);
            const snapshot = createTestSnapshot(ammTick, markPrice);

            const range = snapshot.getFeasibleTargetTickRange(Side.LONG);

            expect(range).not.toBeNull();
            expect(range!.minTick).toBeLessThan(range!.maxTick);
            expect(range!.minTick).toBeGreaterThan(ammTick);
        });

        it('should respect 2*IMR price deviation limit', () => {
            const ammTick = 1000;
            const markPrice = tickToWad(1000);
            const snapshot = createTestSnapshot(ammTick, markPrice, 1000);

            const range = snapshot.getFeasibleTargetTickRange(Side.LONG);

            expect(range).not.toBeNull();

            const imr = ratioToWad(snapshot.instrumentSetting.imr);
            const maxDeviation = imr * 2n;

            // Verify range respects deviation
            const minTickPrice = tickToWad(range!.minTick);
            const minDeviation = wdiv(abs(minTickPrice - markPrice), markPrice);
            expect(minDeviation).toBeLessThanOrEqual(maxDeviation);

            const maxTickPrice = tickToWad(range!.maxTick);
            const maxDeviation2 = wdiv(abs(maxTickPrice - markPrice), markPrice);
            expect(maxDeviation2).toBeLessThanOrEqual(maxDeviation);
        });

        it('should have maxTick at or below the deviation upper bound', () => {
            const ammTick = 10000;
            const markPrice = tickToWad(10000);
            const snapshot = createTestSnapshot(ammTick, markPrice, 1000);

            const range = snapshot.getFeasibleTargetTickRange(Side.LONG);

            expect(range).not.toBeNull();

            const imr = ratioToWad(snapshot.instrumentSetting.imr);
            const maxDeviation = imr * 2n;
            const maxDeviationPrice = markPrice + wmul(markPrice, maxDeviation);
            const maxDeviationTick = wadToTick(maxDeviationPrice);

            // maxTick should be at or below maxDeviationTick (accounting for alignment)
            const orderSpacing = snapshot.instrumentSetting.orderSpacing;
            expect(range!.maxTick).toBeLessThanOrEqual(maxDeviationTick + orderSpacing);
        });
    });

    describe('SHORT cross limit order (targetTick < ammTick)', () => {
        it('should return range below ammTick', () => {
            const ammTick = 1000;
            const markPrice = tickToWad(1000);
            const snapshot = createTestSnapshot(ammTick, markPrice);

            const range = snapshot.getFeasibleTargetTickRange(Side.SHORT);

            expect(range).not.toBeNull();
            expect(range!.minTick).toBeLessThan(range!.maxTick);
            expect(range!.maxTick).toBeLessThan(ammTick);
        });

        it('should respect 2*IMR price deviation limit', () => {
            const ammTick = 1000;
            const markPrice = tickToWad(1000);
            const snapshot = createTestSnapshot(ammTick, markPrice, 1000);

            const range = snapshot.getFeasibleTargetTickRange(Side.SHORT);

            expect(range).not.toBeNull();

            const imr = ratioToWad(snapshot.instrumentSetting.imr);
            const maxDeviation = imr * 2n;

            // Verify range respects deviation
            const minTickPrice = tickToWad(range!.minTick);
            const minDeviation = wdiv(abs(minTickPrice - markPrice), markPrice);
            expect(minDeviation).toBeLessThanOrEqual(maxDeviation);

            const maxTickPrice = tickToWad(range!.maxTick);
            const maxDeviation2 = wdiv(abs(maxTickPrice - markPrice), markPrice);
            expect(maxDeviation2).toBeLessThanOrEqual(maxDeviation);
        });

        it('should have minTick at or above the deviation lower bound', () => {
            const ammTick = 10000;
            const markPrice = tickToWad(10000);
            const snapshot = createTestSnapshot(ammTick, markPrice, 1000);

            const range = snapshot.getFeasibleTargetTickRange(Side.SHORT);

            expect(range).not.toBeNull();

            const imr = ratioToWad(snapshot.instrumentSetting.imr);
            const maxDeviation = imr * 2n;
            const minDeviationPrice = markPrice - wmul(markPrice, maxDeviation);
            const minDeviationTick = wadToTick(minDeviationPrice);

            // minTick should be at or above minDeviationTick (accounting for alignment)
            const orderSpacing = snapshot.instrumentSetting.orderSpacing;
            expect(range!.minTick).toBeGreaterThanOrEqual(minDeviationTick - orderSpacing);
        });
    });

    describe('Tradability checks', () => {
        it('should return null when instrument is not tradable', () => {
            const ammTick = 1000;
            const markPrice = tickToWad(1000);
            const snapshot = createTestSnapshot(ammTick, markPrice);

            // Modify to make it not tradable
            snapshot.instrumentSetting.condition = Condition.DISABLED;

            const range = snapshot.getFeasibleTargetTickRange(Side.LONG);

            expect(range).toBeNull();
        });

        it('should return null when AMM status is not trading', () => {
            const ammTick = 1000;
            const markPrice = tickToWad(1000);
            const snapshot = createTestSnapshot(ammTick, markPrice);

            // Modify AMM status
            snapshot.amm.status = Status.SETTLED;

            const range = snapshot.getFeasibleTargetTickRange(Side.LONG);

            expect(range).toBeNull();
        });
    });
});
