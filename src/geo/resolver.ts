import { CITIES_DATABASE } from './cities';
import { CityEntry } from '../types';
// @ts-ignore
import tzlookup from 'tz-lookup';

/**
 * Normalizes query string for fuzzy search (removes spaces, commas, hyphens, lowercase).
 */
function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/[\s,\-_市省区县\.]/g, '').trim();
}

/**
 * Searches the city database for matching city entries.
 */
export function lookupCity(query: string): CityEntry[] {
  if (!query || !query.trim()) return [];

  const raw = query.trim().toLowerCase();
  const norm = normalizeQuery(query);

  const exactMatches: CityEntry[] = [];
  const partialMatches: CityEntry[] = [];

  for (const city of CITIES_DATABASE) {
    const nameNorm = normalizeQuery(city.name);
    const cnNorm = city.chineseName ? normalizeQuery(city.chineseName) : '';
    const pinyinNorm = city.pinyin ? normalizeQuery(city.pinyin) : '';
    const aliasNorms = (city.aliases || []).map(normalizeQuery);

    // 1. Exact match
    if (
      nameNorm === norm ||
      cnNorm === norm ||
      pinyinNorm === norm ||
      aliasNorms.includes(norm) ||
      city.name.toLowerCase() === raw ||
      city.chineseName === query.trim()
    ) {
      exactMatches.push(city);
      continue;
    }

    // 2. Partial match
    if (
      nameNorm.includes(norm) ||
      norm.includes(nameNorm) ||
      (cnNorm && (cnNorm.includes(norm) || norm.includes(cnNorm))) ||
      (pinyinNorm && pinyinNorm.includes(norm)) ||
      aliasNorms.some(a => a.includes(norm) || norm.includes(a))
    ) {
      partialMatches.push(city);
    }
  }

  return exactMatches.length > 0 ? exactMatches : partialMatches;
}

export interface ResolvedLocation {
  longitude: number;
  timezone: string;
  latitude?: number;
  placeName?: string;
  warning?: string;
}

/**
 * Resolves location according to BaziInput contract:
 * - If explicit longitude AND timezone are provided, use them directly (place is optional label).
 * - If place is provided, look up coordinates and IANA timezone from GeoNames city database.
 * - If only coordinates (longitude + latitude) are provided, use tz-lookup to resolve IANA timezone.
 * - If place resolves to multiple candidates, throw an error listing candidates.
 * - If place cannot be resolved, throw descriptive error.
 */
export function resolveLocation(input: {
  place?: string;
  longitude?: number;
  latitude?: number;
  timezone?: string;
}): ResolvedLocation {
  // 1. Explicit longitude + timezone provided
  if (input.longitude !== undefined && input.timezone) {
    return {
      longitude: input.longitude,
      timezone: input.timezone,
      latitude: input.latitude,
      placeName: input.place,
    };
  }

  // 2. Place provided
  if (input.place) {
    const candidates = lookupCity(input.place);

    if (candidates.length === 0) {
      // If longitude was provided along with unknown place, but missing timezone
      if (input.longitude !== undefined && input.latitude !== undefined) {
        try {
          const tz = tzlookup(input.latitude, input.longitude);
          return {
            longitude: input.longitude,
            latitude: input.latitude,
            timezone: tz,
            placeName: input.place,
          };
        } catch {
          // continue to throw
        }
      }

      throw new Error(
        `未能识别出生地 "${input.place}"。请改用显式字段传入 \`longitude\` (东经为正) 和 \`timezone\` (IANA 时区名，如 "Asia/Shanghai" 或 "America/Los_Angeles")。`
      );
    }

    if (candidates.length > 1) {
      const listStr = candidates
        .map(
          c =>
            `• ${c.chineseName || c.name} (${c.name}, ${c.province || c.country}) -> 经度: ${c.longitude}°, 时区: "${c.timezone}"`
        )
        .join('\n');
      throw new Error(
        `地名 "${input.place}" 匹配到多个候选城市，请显式选择或指定 \`longitude\` 与 \`timezone\`:\n${listStr}`
      );
    }

    const city = candidates[0];
    return {
      longitude: input.longitude !== undefined ? input.longitude : city.longitude,
      timezone: input.timezone || city.timezone,
      latitude: input.latitude !== undefined ? input.latitude : city.latitude,
      placeName: `${city.chineseName || city.name} (${city.country})`,
    };
  }

  // 3. Only coordinates provided without timezone
  if (input.longitude !== undefined) {
    if (input.latitude !== undefined) {
      try {
        const tz = tzlookup(input.latitude, input.longitude);
        return {
          longitude: input.longitude,
          latitude: input.latitude,
          timezone: input.timezone || tz,
        };
      } catch (err) {
        throw new Error(
          `根据经纬度 (${input.longitude}, ${input.latitude}) 推算时区失败，请显式提供 \`timezone\` (IANA 时区名)。`
        );
      }
    }

    if (!input.timezone) {
      throw new Error(
        `提供了经度 (${input.longitude}) 但缺少 \`timezone\` (IANA 时区名) 或 \`place\`。严禁通过经度四舍五入推算时区，请显式指定 \`timezone\`。`
      );
    }

    return {
      longitude: input.longitude,
      timezone: input.timezone,
    };
  }

  throw new Error(
    '缺少出生地信息：请提供 `place` (如 "广州", "Tacoma, WA")，或同时提供 `longitude` 与 `timezone`。'
  );
}
