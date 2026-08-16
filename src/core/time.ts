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
 * Returns the UTC offset in minutes for a given instant in an IANA timezone.
 */
export function tzOffsetMinutes(instantMs: number, tz: string): number {
  return Math.round(tzOffsetMs(instantMs, tz) / 60000);
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
      `墙钟时刻 ${wall.year}-${String(wall.month).padStart(2, '0')}-${String(wall.day).padStart(2, '0')} ${String(wall.hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 在时区 ${tz} 中不存在（因夏令时春季跳跃），请核对出生记录。`
    );
  }

  // 2. Fall-back overlap: Wall clock time occurs twice
  if (candidates.length > 1) {
    if (dstFold === undefined) {
      const c1Str = new Date(candidates[0]).toISOString();
      const c2Str = new Date(candidates[1]).toISOString();
      throw new Error(
        `墙钟时刻 ${wall.year}-${String(wall.month).padStart(2, '0')}-${String(wall.day).padStart(2, '0')} ${String(wall.hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} 在时区 ${tz} 中存在夏令时折返歧义（该时刻出现两次: 1st ${c1Str}, 2nd ${c2Str}）。请提供 dstFold=0 (夏令时) 或 dstFold=1 (标准时) 以消歧。`
      );
    }
    const chosenInstant = candidates[dstFold === 1 ? 1 : 0];
    const offsetMinutes = tzOffsetMinutes(chosenInstant, tz);
    const isDst = dstFold === 0;
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

  // Determine whether DST is active by comparing offset with winter offset (Jan 1) or summer offset (Jul 1)
  const janOffset = tzOffsetMinutes(Date.UTC(wall.year, 0, 15, 12, 0), tz);
  const julOffset = tzOffsetMinutes(Date.UTC(wall.year, 6, 15, 12, 0), tz);
  const standardOffset = Math.min(janOffset, julOffset);
  const isDst = offsetMinutes > standardOffset;

  return {
    instant,
    offsetMinutes,
    isDst,
  };
}

/**
 * Formats offset in minutes to string like "+08:00", "-07:00 (夏令时生效)"
 */
export function formatOffsetString(offsetMinutes: number, isDst: boolean): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  const base = `${sign}${h}:${m}`;
  return isDst ? `${base} (夏令时生效)` : base;
}
