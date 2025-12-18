import { formatUnits } from 'viem';
import { MinimalPearl } from '../types/contract';
import { wdiv } from '../math';
import { WAD, ZERO } from '../constants';
import { tickToSqrtX96, wadToTick, tickToWad } from '../math';
import { Range } from '../types/range';
import { DEFAULT_DECIMALS } from '../utils/format';
import { ChartLiquidityDetailsFromApi, DepthChartData, DepthData } from '../apis/interfaces';

// ============================================================================
// Helper Functions
// ============================================================================

function _page(currTick: number, tick: number, pageAdjustmentDelta: number, size: number, right: boolean): number {
    const adjustedCurrTick = currTick - pageAdjustmentDelta;
    let tmp;
    if (right) {
        tmp = tick - adjustedCurrTick;
    } else {
        tmp = adjustedCurrTick - tick;
    }
    if (tmp <= 0) return 0;

    const page = right ? Math.ceil(tmp / size) - 1 : Math.ceil(tmp / size) - (pageAdjustmentDelta == 0 ? 1 : 0);
    return page;
}

// ============================================================================
// Main Functions
// ============================================================================

export function getDepthRangeDataByLiquidityDetails(
    liquidityDetails: ChartLiquidityDetailsFromApi,
    size: number,
    stepRatio: number,
    isInverse = false,
    lowerPrice?: bigint,
    upperPrice?: bigint
): DepthData {
    let pageAdjustmentDelta = 0;
    if (liquidityDetails.amm.tick % size !== 0) {
        pageAdjustmentDelta =
            liquidityDetails.amm.tick > 0
                ? liquidityDetails.amm.tick % size
                : size - (-liquidityDetails.amm.tick % size);
    }

    const maxTick = Math.max(...liquidityDetails.tids);
    const minTick = Math.min(...liquidityDetails.tids);
    const bnMin = (left: bigint, right: bigint): bigint => (left > right ? right : left);
    let minPriceDelta: bigint;
    if (!isInverse) {
        minPriceDelta = bnMin(
            tickToWad(Number(maxTick)) - tickToWad(liquidityDetails.amm.tick),
            tickToWad(liquidityDetails.amm.tick) - tickToWad(minTick)
        );
    } else {
        minPriceDelta = bnMin(
            tickToWad(-liquidityDetails.amm.tick) - tickToWad(-Number(maxTick)),
            tickToWad(-minTick) - tickToWad(-liquidityDetails.amm.tick)
        );
        lowerPrice = wdiv(WAD, tickToWad(-liquidityDetails.amm.tick) + minPriceDelta);
        upperPrice = wdiv(WAD, tickToWad(-liquidityDetails.amm.tick) - minPriceDelta);
    }
    const rightTickDelta = upperPrice
        ? wadToTick(upperPrice) - liquidityDetails.amm.tick
        : wadToTick(tickToWad(liquidityDetails.amm.tick) + minPriceDelta) - liquidityDetails.amm.tick;
    const rightLength = Number((tickToWad(rightTickDelta) / 10n ** 14n / BigInt(stepRatio)).toString());
    const right: DepthChartData[] = buildDepthChartData(
        liquidityDetails.amm.sqrtPX96,
        liquidityDetails.amm.liquidity,
        liquidityDetails.amm.tick,
        rightTickDelta,
        liquidityDetails.tick2Pearl,
        size,
        rightLength,
        pageAdjustmentDelta,
        true
    );
    const leftTickDelta = lowerPrice
        ? liquidityDetails.amm.tick - wadToTick(lowerPrice)
        : liquidityDetails.amm.tick - wadToTick(tickToWad(liquidityDetails.amm.tick) - minPriceDelta);
    const leftLength = Number((tickToWad(leftTickDelta) / 10n ** 14n / BigInt(stepRatio)).toString());
    const left: DepthChartData[] = buildDepthChartData(
        liquidityDetails.amm.sqrtPX96,
        liquidityDetails.amm.liquidity,
        liquidityDetails.amm.tick,
        leftTickDelta,
        liquidityDetails.tick2Pearl,
        size,
        leftLength,
        pageAdjustmentDelta,
        false
    );
    return { left, right };
}

export function buildDepthChartData(
    currPX96: bigint,
    currLiquidity: bigint,
    currTick: number,
    tickDelta: number,
    tick2Pearl: Map<number, MinimalPearl>,
    size: number,
    length: number,
    pageAdjustmentDelta: number,
    right: boolean
): DepthChartData[] {
    // pageAdjustmentDelta is used to adjust every page's tick to aligned with ORDER_SPACING
    const ret: DepthChartData[] = [];
    const page2BaseSize: Map<number, bigint> = new Map();
    const lastPageTick: Map<number, number> = new Map();

    for (
        let tick = currTick;
        right ? tick < currTick + tickDelta : tick > currTick - tickDelta;
        right ? (tick += 1) : (tick -= 1)
    ) {
        const page = _page(currTick, tick, pageAdjustmentDelta, size, right);
        if (page >= length) break;
        lastPageTick.set(page, tick);

        const pearl = tick2Pearl.get(tick);
        let currBaseSize = page2BaseSize.get(page) ?? ZERO;
        if (pearl) {
            if ((right && pearl.left < 0n) || (!right && pearl.left > 0n)) {
                currBaseSize = (pearl.left < 0n ? -pearl.left : pearl.left) + currBaseSize;
            }
            const targetPX96 = tickToSqrtX96(tick);
            // Create a temporary Range instance to use instance methods
            const tempRange = new Range(0n, 0n, 0n, currPX96, 0, 0);
            currBaseSize = currBaseSize + tempRange.getDeltaBase(currPX96, targetPX96, currLiquidity, false);
            currPX96 = targetPX96;
            if (pearl.liquidityNet !== 0n) {
                currLiquidity = currLiquidity + pearl.liquidityNet * (right ? 1n : -1n);
            }
            page2BaseSize.set(page, currBaseSize);
        } else if (tick % size === 0) {
            const targetPX96 = tickToSqrtX96(tick);
            // Create a temporary Range instance to use instance methods
            const tempRange = new Range(0n, 0n, 0n, currPX96, 0, 0);
            const deltaBase = tempRange.getDeltaBase(currPX96, targetPX96, currLiquidity, !right);
            currBaseSize = currBaseSize + (deltaBase < 0n ? -deltaBase : deltaBase);
            currPX96 = targetPX96;
            page2BaseSize.set(page, currBaseSize);
        }
    }
    for (const [page, baseSize] of page2BaseSize) {
        const tick = lastPageTick.get(page)!;
        const price = Number(formatUnits(tickToWad(tick), DEFAULT_DECIMALS));
        const base = Number(formatUnits(baseSize, DEFAULT_DECIMALS));
        ret.push({ tick, price, base });
    }
    return ret;
}
