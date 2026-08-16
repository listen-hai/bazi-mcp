import { CityEntry } from '../types';
// @ts-ignore
import tzlookup from 'tz-lookup';
// @ts-ignore
import cityTimezones from 'city-timezones';

interface CityTimezoneEntry {
  city: string;
  city_ascii: string;
  lat: number;
  lng: number;
  pop: number;
  country: string;
  iso2: string;
  iso3: string;
  province: string;
  state_ansi?: string;
  timezone: string;
}

/**
 * Normalizes query string for fuzzy search.
 */
function normalizeQuery(q: string): string {
  return q
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s,\-_\.']/g, '')
    .trim();
}

/**
 * Converts a city-timezones entry to our CityEntry format,
 * using tz-lookup to correct potentially stale IANA timezone names.
 */
function toCityEntry(ct: CityTimezoneEntry): CityEntry {
  let timezone = ct.timezone;
  try {
    // Use tz-lookup for authoritative IANA timezone from coordinates
    timezone = tzlookup(ct.lat, ct.lng);
  } catch {
    // Fall back to city-timezones' own timezone
  }

  return {
    name: ct.city,
    country: ct.iso2,
    province: ct.province,
    longitude: ct.lng,
    latitude: ct.lat,
    timezone,
  };
}

/**
 * Searches the global city-timezones database (7,329 cities, 227 countries).
 * Supports English city names, with fuzzy matching on city and city_ascii fields.
 */
export function lookupCity(query: string): CityEntry[] {
  if (!query || !query.trim()) return [];

  const norm = normalizeQuery(query);
  const db: CityTimezoneEntry[] = cityTimezones.cityMapping;

  const exactMatches: CityTimezoneEntry[] = [];
  const partialMatches: CityTimezoneEntry[] = [];

  for (const city of db) {
    const nameNorm = normalizeQuery(city.city);
    const asciiNorm = normalizeQuery(city.city_ascii);
    const provinceNorm = normalizeQuery(city.province || '');
    const countryNorm = normalizeQuery(city.country || '');

    // 1. Exact match on city name or ascii name
    if (nameNorm === norm || asciiNorm === norm) {
      exactMatches.push(city);
      continue;
    }

    // 2. "City, Province/State" style query (e.g. "San Francisco, CA" or "Kunming, Yunnan")
    if (norm.includes(asciiNorm) || norm.includes(nameNorm)) {
      // Check if province/state also matches the remainder
      const remainder = norm.replace(asciiNorm, '').replace(nameNorm, '');
      if (
        remainder.length === 0 ||
        provinceNorm.includes(remainder) ||
        countryNorm.includes(remainder) ||
        (city.state_ansi && normalizeQuery(city.state_ansi) === remainder)
      ) {
        exactMatches.push(city);
        continue;
      }
    }

    // 3. Partial match
    if (
      nameNorm.includes(norm) ||
      asciiNorm.includes(norm) ||
      (norm.length >= 3 && (nameNorm.startsWith(norm) || asciiNorm.startsWith(norm)))
    ) {
      partialMatches.push(city);
    }
  }

  // Deduplicate by city name + country, preferring higher population
  let rawResults = exactMatches.length > 0 ? exactMatches : partialMatches;
  rawResults.sort((a, b) => (b.pop || 0) - (a.pop || 0));

  const seen = new Set<string>();
  const results: CityEntry[] = [];

  for (const r of rawResults) {
    const key = `${r.city}|${r.country}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(toCityEntry(r));
    }
  }

  return results.slice(0, 10); // Limit to 10 results
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
 * - If explicit longitude AND timezone are provided, use them directly.
 * - If place is provided, look up coordinates and IANA timezone from city-timezones.
 * - If only coordinates (longitude + latitude) are provided, use tz-lookup.
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
        `未能识别出生地 "${input.place}"。请使用英文城市名（如 "Beijing", "New York", "Lagos"），或显式传入 \`longitude\` 和 \`timezone\`。`
      );
    }

    if (candidates.length > 1) {
      // Check if top result is a strong exact match — if so, just use it
      const topName = normalizeQuery(candidates[0].name);
      const queryNorm = normalizeQuery(input.place);
      if (topName === queryNorm) {
        const city = candidates[0];
        return {
          longitude: input.longitude !== undefined ? input.longitude : city.longitude,
          timezone: input.timezone || city.timezone,
          latitude: input.latitude !== undefined ? input.latitude : city.latitude,
          placeName: `${city.name} (${city.country})`,
        };
      }

      const listStr = candidates
        .slice(0, 5)
        .map(
          c =>
            `• ${c.name} (${c.province || ''}, ${c.country}) -> 经度: ${c.longitude}°, 时区: "${c.timezone}"`
        )
        .join('\n');
      throw new Error(
        `地名 "${input.place}" 匹配到多个候选城市，请更精确指定（如 "San Francisco, CA"）或指定 \`longitude\` 与 \`timezone\`:\n${listStr}`
      );
    }

    const city = candidates[0];
    return {
      longitude: input.longitude !== undefined ? input.longitude : city.longitude,
      timezone: input.timezone || city.timezone,
      latitude: input.latitude !== undefined ? input.latitude : city.latitude,
      placeName: `${city.name} (${city.country})`,
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
    '缺少出生地信息：请提供 `place` (英文城市名，如 "Beijing", "New York", "Lagos")，或同时提供 `longitude` 与 `timezone`。'
  );
}
