import { Solar } from 'lunar-javascript';
import { WallDateTime } from '../types';

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getDTF(tz: string): Intl.DateTimeFormat {
  if (!dtfCache.has(tz)) {
    dtfCache.set(
      tz,
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  }
  return dtfCache.get(tz)!;
}

/**
 * Returns the exact UTC offset in milliseconds for a given instant in an IANA timezone.
 * Handles sub-minute historical Local Mean Time (LMT) offsets (e.g. Shanghai +08:05:43).
 */
export function tzOffsetMs(instantMs: number, tz: string): number {
  const p = Object.fromEntries(
    getDTF(tz).formatToParts(new Date(instantMs)).map(x => [x.type, x.value])
  );
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUTC - instantMs;
}

/**
 * Returns the UTC offset in minutes (exact floating-point) for a given instant in an IANA timezone.
 * Preserves sub-minute historical Local Mean Time (LMT) precision without rounding truncation.
 */
export function tzOffsetMinutes(instantMs: number, tz: string): number {
  return tzOffsetMs(instantMs, tz) / 60000;
}

/**
 * Returns the standard (non-DST) offset in minutes around a given instant by sampling
 * monthly points up to 12 months before and 12 months after the instant.
 * Takes max(min over the backward half-window, min over the forward half-window) rather
 * than a single global min: a permanent offset shift is monotonic, so the two half-window
 * minima differ and the max picks whichever offset is actually in force at the instant.
 * Each half-window must span a full annual cycle (12 months, not 6): DST seasons can run
 * well over 6 months (US Central time is in DST ~8 months/year), so a pivot early in such
 * a season would have a 6-month forward window that never reaches standard time again,
 * wrongly reporting the DST offset itself as "standard". A 12-month half-window guarantees
 * both sides observe at least one full annual cycle and therefore see real standard time,
 * while a genuine permanent shift (e.g. Moscow 2011-2014) still resolves correctly since the
 * near side of the pivot keeps returning the offset actually in force there regardless of
 * how far the window reaches on the far side. This also stays immune to mid-year base
 * timezone changes (e.g. Moscow 1922, Phoenix 1944 War Time).
 */
export function getStandardOffsetMinutes(instantMs: number, tz: string): number {
  const base = tzOffsetMs(instantMs, tz) / 60000;
  let minBackward = base;
  let minForward = base;
  for (let i = 1; i <= 12; i++) {
    const backOff = tzOffsetMs(instantMs - i * 30 * 86400000, tz) / 60000;
    if (backOff < minBackward) minBackward = backOff;
    const fwdOff = tzOffsetMs(instantMs + i * 30 * 86400000, tz) / 60000;
    if (fwdOff < minForward) minForward = fwdOff;
  }
  return Math.max(minBackward, minForward);
}

/**
 * Formats an instant in an IANA timezone to WallDateTime.
 */
export function instantToWall(instantMs: number, tz: string): WallDateTime {
  const p = Object.fromEntries(
    getDTF(tz).formatToParts(new Date(instantMs)).map(x => [x.type, x.value])
  );
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour % 24,
    minute: +p.minute,
    second: +p.second,
  };
}

/**
 * Converts UTC timestamp to UTC WallDateTime components.
 */
export function toUTCWall(instantMs: number): WallDateTime {
  const d = new Date(instantMs);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

export interface WallToInstantResult {
  instant: number;
  offsetMinutes: number;
  isDst: boolean;
  candidates?: number[];
  warning?: string;
}

/**
 * Converts a Wall clock time in an IANA timezone to UTC instant with complete DST gap/fold detection.
 */
export function wallToInstant(
  wall: { year: number; month: number; day: number; hour: number; minute?: number; second?: number },
  tz: string,
  dstFold?: 0 | 1
): WallToInstantResult {
  if (wall.month < 1 || wall.month > 12) {
    throw new Error(`Invalid calendar month: ${wall.month} (must be between 1 and 12).`);
  }
  const daysInMonth = new Date(Date.UTC(wall.year, wall.month, 0)).getUTCDate();
  if (wall.day < 1 || wall.day > daysInMonth) {
    throw new Error(
      `Invalid solar calendar date: ${wall.year}-${String(wall.month).padStart(2, '0')}-${String(wall.day).padStart(2, '0')} does not exist (${wall.year} month ${wall.month} has ${daysInMonth} days); please check the birth record.`
    );
  }

  const minute = wall.minute ?? 0;
  const second = wall.second ?? 0;
  const naive = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, minute, second);

  // Check possible offsets across a ±24h search range around the naive timestamp
  // to discover all candidate instants that produce the exact requested wall time in this timezone.
  const candidateSet = new Set<number>();
  const testDeltas = [
    0,
    -3600000,
    3600000,
    -7200000,
    7200000,
    -14400000,
    14400000,
    -86400000,
    86400000,
  ];

  for (const delta of testDeltas) {
    const offMs = tzOffsetMs(naive + delta, tz);
    const instant = naive - offMs;
    const w = instantToWall(instant, tz);
    if (
      w.year === wall.year &&
      w.month === wall.month &&
      w.day === wall.day &&
      w.hour === wall.hour &&
      w.minute === minute &&
      w.second === second
    ) {
      candidateSet.add(instant);
    }
  }

  const candidates = Array.from(candidateSet).sort((a, b) => a - b);

  // 1. Spring-forward gap: Wall clock time does not exist
  if (candidates.length === 0) {
    throw new Error(
      `Wall clock time ${wall.year}-${String(wall.month).padStart(2, '0')}-${String(wall.day).padStart(2, '0')} ${String(wall.hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} does not exist in timezone ${tz} (falls in a DST spring-forward gap); please double-check the birth record.`
    );
  }

  // 2. Fall-back overlap: Wall clock time occurs twice
  if (candidates.length > 1) {
    if (dstFold === undefined) {
      const c1Str = new Date(candidates[0]).toISOString();
      const c2Str = new Date(candidates[1]).toISOString();
      throw new Error(
        `Wall clock time ${wall.year}-${String(wall.month).padStart(2, '0')}-${String(wall.day).padStart(2, '0')} ${String(wall.hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} is ambiguous in timezone ${tz} due to a DST fall-back overlap (this time occurs twice: 1st ${c1Str}, 2nd ${c2Str}). Please provide dstFold=0 (DST) or dstFold=1 (standard time) to disambiguate.`
      );
    }
    const chosenInstant = candidates[dstFold === 1 ? 1 : 0];
    const offsetMinutes = tzOffsetMinutes(chosenInstant, tz);
    const standardOffset = getStandardOffsetMinutes(chosenInstant, tz);
    const isDst = offsetMinutes > standardOffset;
    return {
      instant: chosenInstant,
      offsetMinutes,
      isDst,
      candidates,
    };
  }

  // 3. Normal single instant
  const instant = candidates[0];
  const offsetMinutes = tzOffsetMinutes(instant, tz);
  const standardOffset = getStandardOffsetMinutes(instant, tz);
  const isDst = offsetMinutes > standardOffset;

  return {
    instant,
    offsetMinutes,
    isDst,
  };
}

/**
 * Formats offset in minutes to string like "+08:00", "+08:05:43", "-07:00 (DST in effect)"
 */
export function formatOffsetString(offsetMinutes: number, isDst: boolean): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const totalSeconds = Math.round(abs * 60);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = totalSeconds % 60;
  const base = s > 0 ? `${sign}${h}:${m}:${String(s).padStart(2, '0')}` : `${sign}${h}:${m}`;
  return isDst ? `${base} (DST in effect)` : base;
}


/**
 * Days from a birth instant to the next 节, measured in the fixed UTC+8 frame.
 *
 * The frame is not a detail. lunar-javascript reports 节 instants in the
 * Chinese almanac's fixed UTC+8, blind to the DST China ran 1986-1991, and the
 * month pillar is derived from `instant + 8h` for exactly the same reason. Feed
 * this the same number and both sides agree; feed it a civil wall clock and the
 * 18-day boundary drifts an hour against the month it is supposed to divide.
 *
 * Returns a positive number of days (fractional). Only 节 count -- 中气 such as
 * 春分 do not start a month and getNextJie skips them.
 */
export function daysToNextJie(frameMs: number): number {
  const w = toUTCWall(frameMs);
  const jie = Solar.fromYmdHms(w.year, w.month, w.day, w.hour, w.minute, w.second)
    .getLunar()
    .getNextJie()
    .getSolar();
  const jieMs = Date.UTC(jie.getYear(), jie.getMonth() - 1, jie.getDay(), jie.getHour(), jie.getMinute(), jie.getSecond());
  return (jieMs - frameMs) / 86400000;
}
