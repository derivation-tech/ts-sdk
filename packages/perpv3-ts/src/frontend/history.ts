import { getUnixTime, subDays, subMonths } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { HISTORY_RANGE } from '../apis/constants';

export function getStartEndTimeByRangeType(rangeType: HISTORY_RANGE): { startTime: number; endTime: number } {
    const now = new Date();
    const utcNow = toZonedTime(now, 'UTC');
    const endTime = getUnixTime(utcNow);

    if (rangeType === HISTORY_RANGE.D_1) {
        const startTime = getUnixTime(subDays(utcNow, 1));
        return { startTime, endTime };
    } else if (rangeType === HISTORY_RANGE.D_7) {
        const startTime = getUnixTime(subDays(utcNow, 7));
        return { startTime, endTime };
    } else if (rangeType === HISTORY_RANGE.M_1) {
        const startTime = getUnixTime(subMonths(utcNow, 1));
        return { startTime, endTime };
    } else if (rangeType === HISTORY_RANGE.M_3) {
        const startTime = getUnixTime(subMonths(utcNow, 3));
        return { startTime, endTime };
    }

    const startTime = 0;
    return { startTime, endTime };
}
